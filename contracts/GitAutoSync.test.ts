import { describe, it, expect } from "bun:test";
import { GitAutoSync, type GitAutoSyncDeps } from "@hooks/contracts/GitAutoSync";
import type { SessionEndInput } from "@hooks/core/types/hook-inputs";

function makeDeps(overrides: Partial<GitAutoSyncDeps> = {}): GitAutoSyncDeps {
  return {
    execSync: () => "",
    spawn: () => ({ unref() {} }),
    dateNow: () => Date.now(),
    exit: () => {},
    claudeDir: "/tmp/test-git-auto-sync",
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

function makeInput(): SessionEndInput {
  return { session_id: "test" };
}

describe("GitAutoSync contract", () => {
  it("has correct name and event", () => {
    expect(GitAutoSync.name).toBe("GitAutoSync");
    expect(GitAutoSync.event).toBe("SessionEnd");
  });

  it("accepts all SessionEnd inputs", () => {
    expect(GitAutoSync.accepts(makeInput())).toBe(true);
  });

  it("returns silent output", () => {
    const deps = makeDeps({
      execSync: (cmd: string) => {
        if (cmd === "git status --porcelain") return "";
        return "";
      },
    });

    const result = GitAutoSync.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("silent");
    }
  });

  it("execute suppresses exit calls from runGitAutoSync", () => {
    let exitCalled = false;
    const deps = makeDeps({
      execSync: (cmd: string) => {
        if (cmd === "git status --porcelain") return "";
        return "";
      },
      exit: () => { exitCalled = true; },
    });

    GitAutoSync.execute(makeInput(), deps);
    // exit should NOT have been called — execute suppresses it
    expect(exitCalled).toBe(false);
  });
});

describe("GitAutoSync defaultDeps", () => {
  it("defaultDeps.execSync throws on failed command", () => {
    expect(() => GitAutoSync.defaultDeps.execSync("false", { timeout: 1000 })).toThrow();
  });

  it("defaultDeps.spawn returns an object with unref", () => {
    const result = GitAutoSync.defaultDeps.spawn("echo", ["test"], { cwd: "/tmp" });
    expect(typeof result.unref).toBe("function");
    result.unref(); // should not throw
  });

  it("defaultDeps.readFileSync throws on missing file", () => {
    expect(() => GitAutoSync.defaultDeps.readFileSync("/tmp/nonexistent-pai-test-file-12345.txt")).toThrow();
  });

  it("defaultDeps.stderr writes without throwing", () => {
    expect(() => GitAutoSync.defaultDeps.stderr("test")).not.toThrow();
  });

  it("defaultDeps.dateNow returns a number", () => {
    expect(typeof GitAutoSync.defaultDeps.dateNow()).toBe("number");
  });

  it("defaultDeps.existsSync returns a boolean", () => {
    expect(typeof GitAutoSync.defaultDeps.existsSync("/tmp")).toBe("boolean");
  });

  it("defaultDeps.mkdirSync does not throw for /tmp", () => {
    expect(() => GitAutoSync.defaultDeps.mkdirSync("/tmp", { recursive: true })).not.toThrow();
  });

  it("defaultDeps.copyFileSync is callable", () => {
    // copyFile adapter doesn't throw; it uses Result internally
    expect(typeof GitAutoSync.defaultDeps.copyFileSync).toBe("function");
    // Call with nonexistent source - the adapter handles errors internally
    GitAutoSync.defaultDeps.copyFileSync("/tmp/nonexistent-pai-12345.txt", "/tmp/dest-pai-12345.txt");
  });

  it("defaultDeps.unlinkSync does not throw on missing file", () => {
    expect(() => GitAutoSync.defaultDeps.unlinkSync("/tmp/nonexistent-pai-12345.txt")).not.toThrow();
  });

  it("defaultDeps.getTimestamp returns a string", () => {
    expect(typeof GitAutoSync.defaultDeps.getTimestamp()).toBe("string");
  });

  it("defaultDeps.exit is a function", () => {
    expect(typeof GitAutoSync.defaultDeps.exit).toBe("function");
  });
});
