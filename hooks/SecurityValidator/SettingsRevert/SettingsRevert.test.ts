import { describe, expect, it } from "bun:test";
import type { ToolHookInput } from "@hooks/core/types/hook-inputs";
import { ErrorCode, ResultError } from "@hooks/core/error";
import { ok, type Result } from "@hooks/core/result";
import {
  SettingsRevert,
  type SettingsRevertDeps,
} from "@hooks/hooks/SecurityValidator/SettingsRevert/SettingsRevert.contract";
import { snapshotPath } from "@hooks/hooks/SecurityValidator/SettingsGuard/SettingsGuard.contract";

const HOME = "/Users/testuser";
const SESSION = "test-session-abc";
const SETTINGS_PATH = `${HOME}/.claude/settings.json`;
const LOCAL_SETTINGS_PATH = `${HOME}/.claude/settings.local.json`;
const SNAP_MAIN = snapshotPath(SESSION, "settings.json");
const SNAP_LOCAL = snapshotPath(SESSION, "settings.local.json");

const ORIGINAL = '{"hooks":{"enabled":true}}';
const MODIFIED = '{"hooks":{"enabled":false},"injected":"malicious"}';

type FakeFS = Map<string, string>;

function postDeps(fs: FakeFS, overrides: Partial<SettingsRevertDeps> = {}): SettingsRevertDeps {
  return {
    homedir: () => HOME,
    stderr: () => {},
    fileExists: (p) => fs.has(p),
    readFile: (p) => {
      const content = fs.get(p);
      if (content === undefined) return { ok: false, error: new ResultError(ErrorCode.FileNotFound, p) };
      return ok(content);
    },
    writeFile: (p, c) => { fs.set(p, c); return ok(undefined as void); },
    appendFile: (p, c) => { const prev = fs.get(p) || ""; fs.set(p, prev + c); return ok(undefined as void); },
    ensureDir: () => ok(undefined as void),
    baseDir: "/fake/pai",
    ...overrides,
  };
}

function bashInput(command: string): ToolHookInput {
  return { session_id: SESSION, tool_name: "Bash", tool_input: { command } };
}

// ─── accepts ────────────────────────────────────────────────────────────────

describe("SettingsRevert.accepts", () => {
  it("has correct name and event", () => {
    expect(SettingsRevert.name).toBe("SettingsRevert");
    expect(SettingsRevert.event).toBe("PostToolUse");
  });

  it("accepts Bash tool calls", () => {
    expect(SettingsRevert.accepts(bashInput("echo hi"))).toBe(true);
  });

  it("rejects non-Bash tools", () => {
    const input: ToolHookInput = { session_id: SESSION, tool_name: "Edit", tool_input: {} };
    expect(SettingsRevert.accepts(input)).toBe(false);
  });
});

// ─── execute: no change ─────────────────────────────────────────────────────

describe("SettingsRevert.execute — no change", () => {
  it("returns silent when no snapshot exists", () => {
    const fs: FakeFS = new Map([[SETTINGS_PATH, ORIGINAL]]);
    const result = SettingsRevert.execute(bashInput("ls"), postDeps(fs));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
  });

  it("returns silent when settings unchanged", () => {
    const fs: FakeFS = new Map([
      [SETTINGS_PATH, ORIGINAL],
      [SNAP_MAIN, ORIGINAL],
    ]);
    const result = SettingsRevert.execute(bashInput("git status"), postDeps(fs));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
  });
});

// ─── execute: revert ────────────────────────────────────────────────────────

describe("SettingsRevert.execute — revert", () => {
  it("reverts settings.json when content changed", () => {
    const fs: FakeFS = new Map([
      [SETTINGS_PATH, MODIFIED],
      [SNAP_MAIN, ORIGINAL],
    ]);
    const result = SettingsRevert.execute(bashInput("python3 -c '...'"), postDeps(fs));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("continue");
      if (result.value.type === "continue") {
        expect(result.value.additionalContext).toContain("SECURITY");
        expect(result.value.additionalContext).toContain("reverted");
      }
    }
    // Verify the file was actually restored
    expect(fs.get(SETTINGS_PATH)).toBe(ORIGINAL);
  });

  it("reverts settings.local.json when content changed", () => {
    const fs: FakeFS = new Map([
      [LOCAL_SETTINGS_PATH, MODIFIED],
      [SNAP_LOCAL, ORIGINAL],
    ]);
    const result = SettingsRevert.execute(bashInput("node -e '...'"), postDeps(fs));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("continue");
    expect(fs.get(LOCAL_SETTINGS_PATH)).toBe(ORIGINAL);
  });

  it("reverts both files when both changed", () => {
    const fs: FakeFS = new Map([
      [SETTINGS_PATH, MODIFIED],
      [SNAP_MAIN, ORIGINAL],
      [LOCAL_SETTINGS_PATH, MODIFIED],
      [SNAP_LOCAL, ORIGINAL],
    ]);
    const result = SettingsRevert.execute(bashInput("sed ..."), postDeps(fs));

    expect(result.ok).toBe(true);
    expect(fs.get(SETTINGS_PATH)).toBe(ORIGINAL);
    expect(fs.get(LOCAL_SETTINGS_PATH)).toBe(ORIGINAL);
  });

  it("restores settings.json if it was deleted", () => {
    const fs: FakeFS = new Map([
      [SNAP_MAIN, ORIGINAL],
      // settings.json is missing — simulates deletion
    ]);
    const result = SettingsRevert.execute(bashInput("rm ..."), postDeps(fs));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("continue");
    expect(fs.get(SETTINGS_PATH)).toBe(ORIGINAL);
  });

  it("logs to stderr when reverting", () => {
    const messages: string[] = [];
    const fs: FakeFS = new Map([
      [SETTINGS_PATH, MODIFIED],
      [SNAP_MAIN, ORIGINAL],
    ]);
    const d = { ...postDeps(fs), stderr: (msg: string) => messages.push(msg) };
    SettingsRevert.execute(bashInput("python3 ..."), d);

    expect(messages.length).toBe(1);
    expect(messages[0]).toContain("[SettingsRevert]");
    expect(messages[0]).toContain("settings.json");
  });

  it("writes audit log with action=reverted on revert", () => {
    const fs: FakeFS = new Map([
      [SETTINGS_PATH, MODIFIED],
      [SNAP_MAIN, ORIGINAL],
    ]);
    SettingsRevert.execute(bashInput("python3 ..."), postDeps(fs));

    const logPath = "/fake/pai/MEMORY/SECURITY/settings-audit.jsonl";
    const logContent = fs.get(logPath);
    expect(logContent).toBeDefined();
    const entry = JSON.parse(logContent!.trim());
    expect(entry.action).toBe("reverted");
    expect(entry.target).toContain("settings.json");
  });

  it("writes audit log with action=unchanged when no change", () => {
    const fs: FakeFS = new Map([
      [SETTINGS_PATH, ORIGINAL],
      [SNAP_MAIN, ORIGINAL],
    ]);
    SettingsRevert.execute(bashInput("git status"), postDeps(fs));

    const logPath = "/fake/pai/MEMORY/SECURITY/settings-audit.jsonl";
    const logContent = fs.get(logPath);
    expect(logContent).toBeDefined();
    const entry = JSON.parse(logContent!.trim());
    expect(entry.action).toBe("unchanged");
  });

  it("revert context includes no-bypass instruction", () => {
    const fs: FakeFS = new Map([
      [SETTINGS_PATH, MODIFIED],
      [SNAP_MAIN, ORIGINAL],
    ]);
    const result = SettingsRevert.execute(bashInput("..."), postDeps(fs));

    expect(result.ok).toBe(true);
    if (result.ok && result.value.type === "continue") {
      expect(result.value.additionalContext).toContain("Do NOT attempt");
      expect(result.value.additionalContext).toContain("shell escapes");
    }
  });
});
