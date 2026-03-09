import { describe, it, expect } from "bun:test";
import {
  runGitAutoSync,
  KEY_HOOK_PATTERN,
  KEY_FILES,
  DEBOUNCE_MINUTES,
  type GitAutoSyncDeps,
} from "@hooks/contracts/GitAutoSync";

function makeDeps(overrides: Partial<GitAutoSyncDeps> = {}): GitAutoSyncDeps {
  return {
    execSync: () => "",
    spawn: () => ({ unref() {} }),
    dateNow: () => Date.now(),
    exit: () => {},
    claudeDir: "/tmp/test-claude",
    backupDir: "/tmp/test-backup",
    debug: false,
    getTimestamp: () => "2026-03-09 17:00:00 AEDT",
    mkdirSync: () => undefined,
    copyFileSync: () => {},
    readFileSync: () => "",
    existsSync: () => false,
    unlinkSync: () => {},
    stderr: () => {},
    ...overrides,
  };
}

describe("runGitAutoSync pipeline", () => {
  it("exits early when git status is clean", () => {
    let exitCode = -1;
    const deps = makeDeps({
      execSync: (cmd: string) => {
        if (cmd === "git status --porcelain") return "";
        return "";
      },
      exit: (code: number) => { exitCode = code; },
    });
    runGitAutoSync(deps);
    expect(exitCode).toBe(0);
  });

  it("commits and pushes when status is dirty", () => {
    const commands: string[] = [];
    let pushSpawned = false;
    let unrefCalled = false;

    const deps = makeDeps({
      execSync: (cmd: string) => {
        commands.push(cmd);
        if (cmd === "git status --porcelain") return "M settings.json\n";
        if (cmd.includes("git log -1")) return ""; // no previous auto-sync
        if (cmd.includes("git ls-files hooks/")) return "";
        return "";
      },
      spawn: (cmd: string, args: string[]) => {
        if (cmd === "git" && args[0] === "push") pushSpawned = true;
        return { unref() { unrefCalled = true; } };
      },
    });

    runGitAutoSync(deps);

    expect(commands).toContain("git add -A");
    expect(commands.some(c => c.includes("git commit"))).toBe(true);
    expect(commands.some(c => c.includes("auto-sync"))).toBe(true);
    expect(pushSpawned).toBe(true);
    expect(unrefCalled).toBe(true);
  });

  it("exits early when last auto-sync is within debounce window", () => {
    let exitCode = -1;
    const now = Date.now();
    // Last auto-sync was 5 minutes ago (well within 15 min debounce)
    const lastCommitEpoch = Math.floor(now / 1000) - 5 * 60;

    const deps = makeDeps({
      execSync: (cmd: string) => {
        if (cmd === "git status --porcelain") return "M file.txt\n";
        if (cmd.includes("git log -1")) return String(lastCommitEpoch);
        return "";
      },
      exit: (code: number) => { exitCode = code; },
      dateNow: () => now,
    });

    runGitAutoSync(deps);
    expect(exitCode).toBe(0);
  });

  it("prints debounce message when debug is enabled", () => {
    const stderrMessages: string[] = [];
    const now = Date.now();
    const lastCommitEpoch = Math.floor(now / 1000) - 5 * 60;

    const deps = makeDeps({
      execSync: (cmd: string) => {
        if (cmd === "git status --porcelain") return "M file.txt\n";
        if (cmd.includes("git log -1")) return String(lastCommitEpoch);
        return "";
      },
      exit: () => {},
      dateNow: () => now,
      debug: true,
      stderr: (msg: string) => { stderrMessages.push(msg); },
    });

    runGitAutoSync(deps);
    expect(stderrMessages.some(m => m.includes("debounced"))).toBe(true);
    expect(stderrMessages.some(m => m.includes(String(DEBOUNCE_MINUTES)))).toBe(true);
  });

  it("proceeds when debounce period has expired", () => {
    const commands: string[] = [];
    const now = Date.now();
    // Last auto-sync was 20 minutes ago (past 15 min debounce)
    const lastCommitEpoch = Math.floor(now / 1000) - 20 * 60;

    const deps = makeDeps({
      execSync: (cmd: string) => {
        commands.push(cmd);
        if (cmd === "git status --porcelain") return "M file.txt\n";
        if (cmd.includes("git log -1")) return String(lastCommitEpoch);
        if (cmd.includes("git ls-files hooks/")) return "";
        return "";
      },
      dateNow: () => now,
      spawn: () => ({ unref() {} }),
    });

    runGitAutoSync(deps);
    expect(commands).toContain("git add -A");
    expect(commands.some(c => c.includes("git commit"))).toBe(true);
  });

  it("calls cleanupLock on error when lock exists", () => {
    let unlinkedPath = "";

    const deps = makeDeps({
      execSync: (cmd: string) => {
        if (cmd === "git status --porcelain") return "M file.txt\n";
        if (cmd.includes("git log -1")) return "";
        if (cmd === "git add -A") throw new Error("git lock error");
        return "";
      },
      existsSync: (path: string) => path.endsWith("index.lock"),
      unlinkSync: (path: string) => { unlinkedPath = path; },
    });

    runGitAutoSync(deps);
    expect(unlinkedPath).toContain("index.lock");
  });

  it("does not unlink when lock does not exist on error", () => {
    let unlinkCalled = false;

    const deps = makeDeps({
      execSync: (cmd: string) => {
        if (cmd === "git status --porcelain") return "M file.txt\n";
        if (cmd.includes("git log -1")) return "";
        if (cmd === "git add -A") throw new Error("some error");
        return "";
      },
      existsSync: () => false,
      unlinkSync: () => { unlinkCalled = true; },
    });

    runGitAutoSync(deps);
    expect(unlinkCalled).toBe(false);
  });

  it("prints error message in debug mode on error", () => {
    const stderrMessages: string[] = [];

    const deps = makeDeps({
      execSync: (cmd: string) => {
        if (cmd === "git status --porcelain") return "M file.txt\n";
        if (cmd.includes("git log -1")) return "";
        if (cmd === "git add -A") throw new Error("test error message");
        return "";
      },
      debug: true,
      stderr: (msg: string) => { stderrMessages.push(msg); },
    });

    runGitAutoSync(deps);
    expect(stderrMessages.some(m => m.includes("test error message"))).toBe(true);
  });

  it("backs up key files before pull", () => {
    const commandOrder: string[] = [];
    let mkdirCalled = false;
    const copiedFiles: string[] = [];

    const deps = makeDeps({
      execSync: (cmd: string) => {
        commandOrder.push(cmd.split(" ")[0] + (cmd.includes("commit") ? " commit" : cmd.includes("pull") ? " pull" : ""));
        if (cmd === "git status --porcelain") return "M settings.json\n";
        if (cmd.includes("git log -1")) return "";
        if (cmd.includes("git ls-files hooks/")) return "hooks/GitAutoSync.ts\nhooks/other.ts\n";
        return "";
      },
      existsSync: (path: string) => {
        // All key files and hook files exist
        for (const f of KEY_FILES) {
          if (path.endsWith(f)) return true;
        }
        if (path.includes("hooks/")) return true;
        return false;
      },
      mkdirSync: () => { mkdirCalled = true; return undefined; },
      copyFileSync: (_src: string, dest: string) => { copiedFiles.push(dest); },
      spawn: () => ({ unref() {} }),
    });

    runGitAutoSync(deps);

    expect(mkdirCalled).toBe(true);
    // Should have copied key files + hook files
    expect(copiedFiles.length).toBeGreaterThan(0);
    // Verify .pre-pull suffix is used
    expect(copiedFiles.every(f => f.endsWith(".pre-pull"))).toBe(true);
    // Verify commit happens before pull in command order
    const commitIdx = commandOrder.findIndex(c => c.includes("commit"));
    const pullIdx = commandOrder.findIndex(c => c.includes("pull"));
    expect(commitIdx).toBeLessThan(pullIdx);
  });

  it("returns null backup when no key files exist", () => {
    let pullExecuted = false;
    let checkDiffCalled = false;

    const deps = makeDeps({
      execSync: (cmd: string) => {
        if (cmd === "git status --porcelain") return "M random.txt\n";
        if (cmd.includes("git log -1")) return "";
        if (cmd.includes("git ls-files hooks/")) return "";
        if (cmd.includes("git pull")) { pullExecuted = true; return ""; }
        return "";
      },
      existsSync: () => false, // no key files exist
      stderr: (msg: string) => {
        if (msg.includes("WARNING")) checkDiffCalled = true;
      },
      spawn: () => ({ unref() {} }),
    });

    runGitAutoSync(deps);
    expect(pullExecuted).toBe(true);
    // No warnings should be emitted since backup is null
    expect(checkDiffCalled).toBe(false);
  });

  it("warns when files change during merge pull", () => {
    const warnings: string[] = [];

    const deps = makeDeps({
      execSync: (cmd: string) => {
        if (cmd === "git status --porcelain") return "M settings.json\n";
        if (cmd.includes("git log -1")) return "";
        if (cmd.includes("git ls-files hooks/")) return "";
        return "";
      },
      existsSync: (path: string) => {
        // settings.json exists both in claudeDir and backup
        if (path.endsWith("settings.json")) return true;
        if (path.endsWith(".pre-pull")) return true;
        return false;
      },
      readFileSync: (path: string) => {
        // Backup content differs from current content (simulating merge change)
        if (path.includes(".pre-pull")) return '{"before": true}';
        return '{"after": true}';
      },
      mkdirSync: () => undefined,
      copyFileSync: () => {},
      stderr: (msg: string) => { warnings.push(msg); },
      spawn: () => ({ unref() {} }),
    });

    runGitAutoSync(deps);
    expect(warnings.some(w => w.includes("WARNING") && w.includes("settings.json"))).toBe(true);
  });

  it("does not warn when files are unchanged after merge pull", () => {
    const warnings: string[] = [];

    const deps = makeDeps({
      execSync: (cmd: string) => {
        if (cmd === "git status --porcelain") return "M settings.json\n";
        if (cmd.includes("git log -1")) return "";
        if (cmd.includes("git ls-files hooks/")) return "";
        return "";
      },
      existsSync: (path: string) => {
        if (path.endsWith("settings.json")) return true;
        if (path.endsWith(".pre-pull")) return true;
        return false;
      },
      readFileSync: () => '{"same": true}', // same content before and after
      mkdirSync: () => undefined,
      copyFileSync: () => {},
      stderr: (msg: string) => { warnings.push(msg); },
      spawn: () => ({ unref() {} }),
    });

    runGitAutoSync(deps);
    expect(warnings.filter(w => w.includes("WARNING"))).toHaveLength(0);
  });

  it("skips diff check for files not in KEY_FILES or matching KEY_HOOK_PATTERN", () => {
    // This tests checkPostMergeDiff line 96 — the continue path
    const warnings: string[] = [];

    const deps = makeDeps({
      execSync: (cmd: string) => {
        if (cmd === "git status --porcelain") return "M random.txt\n";
        if (cmd.includes("git log -1")) return "";
        // Return a non-key, non-hook file from git ls-files
        if (cmd.includes("git ls-files hooks/")) return "not-a-hook.txt\n";
        return "";
      },
      existsSync: (path: string) => {
        if (path.endsWith("not-a-hook.txt")) return true;
        if (path.endsWith(".pre-pull")) return true;
        return false;
      },
      readFileSync: (path: string) => {
        // Different content — but should NOT trigger warning since file is not key
        if (path.includes(".pre-pull")) return "before";
        return "after";
      },
      mkdirSync: () => undefined,
      copyFileSync: () => {},
      stderr: (msg: string) => { warnings.push(msg); },
      spawn: () => ({ unref() {} }),
    });

    runGitAutoSync(deps);
    expect(warnings.filter(w => w.includes("WARNING"))).toHaveLength(0);
  });

  it("uses timestamp in commit message", () => {
    let commitMsg = "";
    const deps = makeDeps({
      execSync: (cmd: string) => {
        if (cmd === "git status --porcelain") return "M file.txt\n";
        if (cmd.includes("git log -1")) return "";
        if (cmd.includes("git commit")) commitMsg = cmd;
        if (cmd.includes("git ls-files hooks/")) return "";
        return "";
      },
      getTimestamp: () => "2026-03-09 17:00:00 AEDT",
      spawn: () => ({ unref() {} }),
    });

    runGitAutoSync(deps);
    expect(commitMsg).toContain("2026-03-09 17:00:00 AEDT");
    expect(commitMsg).toContain("auto-sync: session end");
  });
});

describe("KEY_HOOK_PATTERN regex", () => {
  it("matches .ts files under hooks/", () => {
    expect(KEY_HOOK_PATTERN.test("hooks/GitAutoSync.ts")).toBe(true);
    expect(KEY_HOOK_PATTERN.test("hooks/some-hook.ts")).toBe(true);
  });

  it("matches nested hook paths", () => {
    expect(KEY_HOOK_PATTERN.test("hooks/sub/deep.ts")).toBe(true);
  });

  it("does not match files outside hooks/", () => {
    expect(KEY_HOOK_PATTERN.test("src/GitAutoSync.ts")).toBe(false);
    expect(KEY_HOOK_PATTERN.test("other.ts")).toBe(false);
  });

  it("does not match non-.ts files under hooks/", () => {
    // The pattern is /^hooks\/.*\.ts$/ so .js would not match
    expect(KEY_HOOK_PATTERN.test("hooks/readme.md")).toBe(false);
    expect(KEY_HOOK_PATTERN.test("hooks/config.json")).toBe(false);
  });

  it("requires hooks/ prefix at start of string", () => {
    expect(KEY_HOOK_PATTERN.test("src/hooks/file.ts")).toBe(false);
  });
});
