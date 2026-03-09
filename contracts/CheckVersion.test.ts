import { describe, test, expect } from "bun:test";
import { CheckVersion, type CheckVersionDeps } from "@hooks/contracts/CheckVersion";
import { ok, err } from "@hooks/core/result";
import { processExecFailed } from "@hooks/core/error";
import type { SessionStartInput } from "@hooks/core/types/hook-inputs";
import type { SilentOutput } from "@hooks/core/types/hook-outputs";
import type { Result } from "@hooks/core/result";
import type { PaiError } from "@hooks/core/error";

const baseInput: SessionStartInput = {
  session_id: "test-session-123",
};

function makeDeps(overrides: Partial<CheckVersionDeps> = {}): CheckVersionDeps {
  return {
    getCurrentVersion: async () => ok("1.0.0"),
    getLatestVersion: async () => ok("1.0.0"),
    isSubagent: () => false,
    stderr: () => {},
    ...overrides,
  };
}

describe("CheckVersion", () => {
  test("name is CheckVersion", () => {
    expect(CheckVersion.name).toBe("CheckVersion");
  });

  test("event is SessionStart", () => {
    expect(CheckVersion.event).toBe("SessionStart");
  });

  test("accepts all SessionStart inputs", () => {
    expect(CheckVersion.accepts(baseInput)).toBe(true);
  });

  test("returns silent when subagent", async () => {
    const deps = makeDeps({ isSubagent: () => true });
    const result = await CheckVersion.execute(baseInput, deps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
  });

  test("returns silent when versions match", async () => {
    const deps = makeDeps({
      getCurrentVersion: async () => ok("2.0.0"),
      getLatestVersion: async () => ok("2.0.0"),
    });
    const result = await CheckVersion.execute(baseInput, deps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
  });

  test("logs update message when versions differ", async () => {
    const messages: string[] = [];
    const deps = makeDeps({
      getCurrentVersion: async () => ok("1.0.0"),
      getLatestVersion: async () => ok("2.0.0"),
      stderr: (msg) => messages.push(msg),
    });
    const result = await CheckVersion.execute(baseInput, deps);
    expect(result.ok).toBe(true);
    expect(messages.length).toBe(1);
    expect(messages[0]).toContain("1.0.0");
    expect(messages[0]).toContain("2.0.0");
  });

  test("returns silent when getCurrentVersion fails", async () => {
    const messages: string[] = [];
    const deps = makeDeps({
      getCurrentVersion: async () => err(processExecFailed("claude --version", new Error("not found"))),
      stderr: (msg) => messages.push(msg),
    });
    const result = await CheckVersion.execute(baseInput, deps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
    expect(messages.length).toBe(0);
  });

  test("returns silent when getLatestVersion fails", async () => {
    const messages: string[] = [];
    const deps = makeDeps({
      getLatestVersion: async () => err(processExecFailed("npm view", new Error("network error"))),
      stderr: (msg) => messages.push(msg),
    });
    const result = await CheckVersion.execute(baseInput, deps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
    expect(messages.length).toBe(0);
  });

  test("returns silent when both version fetches fail", async () => {
    const deps = makeDeps({
      getCurrentVersion: async () => err(processExecFailed("claude", new Error("fail"))),
      getLatestVersion: async () => err(processExecFailed("npm", new Error("fail"))),
    });
    const result = await CheckVersion.execute(baseInput, deps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
  });

  test("does not log when subagent even if versions differ", async () => {
    const messages: string[] = [];
    const deps = makeDeps({
      isSubagent: () => true,
      getCurrentVersion: async () => ok("1.0.0"),
      getLatestVersion: async () => ok("2.0.0"),
      stderr: (msg) => messages.push(msg),
    });
    const result = await CheckVersion.execute(baseInput, deps);
    expect(result.ok).toBe(true);
    expect(messages.length).toBe(0);
  });

  test("does not log when current version is unknown", async () => {
    const messages: string[] = [];
    const deps = makeDeps({
      getCurrentVersion: async () => ok("unknown"),
      getLatestVersion: async () => ok("2.0.0"),
      stderr: (msg) => messages.push(msg),
    });
    const result = await CheckVersion.execute(baseInput, deps);
    expect(result.ok).toBe(true);
    expect(messages.length).toBe(0);
  });

  test("does not log when latest version is unknown", async () => {
    const messages: string[] = [];
    const deps = makeDeps({
      getCurrentVersion: async () => ok("1.0.0"),
      getLatestVersion: async () => ok("unknown"),
      stderr: (msg) => messages.push(msg),
    });
    const result = await CheckVersion.execute(baseInput, deps);
    expect(result.ok).toBe(true);
    expect(messages.length).toBe(0);
  });

  test("does not log when both versions are unknown", async () => {
    const messages: string[] = [];
    const deps = makeDeps({
      getCurrentVersion: async () => ok("unknown"),
      getLatestVersion: async () => ok("unknown"),
      stderr: (msg) => messages.push(msg),
    });
    const result = await CheckVersion.execute(baseInput, deps);
    expect(result.ok).toBe(true);
    expect(messages.length).toBe(0);
  });
});

describe("CheckVersion defaultDeps", () => {
  test("defaultDeps.getCurrentVersion returns a result", async () => {
    const result = await CheckVersion.defaultDeps.getCurrentVersion();
    // May succeed or fail depending on env, but should always return Result
    expect(typeof result.ok).toBe("boolean");
  });

  test("defaultDeps.getLatestVersion returns a result", async () => {
    const result = await CheckVersion.defaultDeps.getLatestVersion();
    expect(typeof result.ok).toBe("boolean");
  });

  test("defaultDeps.isSubagent returns a boolean", () => {
    const result = CheckVersion.defaultDeps.isSubagent();
    expect(typeof result).toBe("boolean");
  });

  test("defaultDeps.stderr writes without throwing", () => {
    expect(() => CheckVersion.defaultDeps.stderr("test")).not.toThrow();
  });
});
