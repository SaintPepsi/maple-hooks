import { describe, expect, test } from "bun:test";
import { processSpawnFailed } from "@hooks/core/error";
import { err, ok } from "@hooks/core/result";
import type { AgentRunnerDeps, RunnerConfig } from "@hooks/runners/agent-runner";
import { runAgent } from "@hooks/runners/agent-runner";

// ─── Test Helpers ──────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<RunnerConfig> = {}): RunnerConfig {
  return {
    prompt: "test prompt",
    model: "opus",
    maxTurns: 5,
    timeout: 60000,
    lockPath: "/tmp/test.lock",
    logPath: "/tmp/test.log",
    source: "test-hook",
    ...overrides,
  };
}

function makeDeps(overrides: Partial<AgentRunnerDeps> = {}): AgentRunnerDeps {
  return {
    appendFile: () => ok(undefined),
    removeFile: () => ok(undefined),
    writeFile: () => ok(undefined),
    spawnSyncSafe: () => ok({ stdout: "", exitCode: 0 }),
    stderr: () => {},
    env: { BUN_TEST: "1" },
    ...overrides,
  };
}

// ─── BUN_TEST Guard ────────────────────────────────────────────────────────

describe("agent-runner / BUN_TEST guard", () => {
  test("throws if BUN_TEST is set and dryRun is false", () => {
    const deps = makeDeps({ env: { BUN_TEST: "1" } });
    expect(() => runAgent(makeConfig(), false, deps)).toThrow("BUN_TEST");
  });

  test("does not throw if BUN_TEST is set and dryRun is true", () => {
    const deps = makeDeps({ env: { BUN_TEST: "1" } });
    expect(() => runAgent(makeConfig(), true, deps)).not.toThrow();
  });

  test("does not throw if BUN_TEST is not set and dryRun is false", () => {
    const deps = makeDeps({ env: {} });
    expect(() => runAgent(makeConfig(), false, deps)).not.toThrow();
  });
});

// ─── Dry-run Mode ──────────────────────────────────────────────────────────

describe("agent-runner / dry-run mode", () => {
  test("logs dry-run event to logPath", () => {
    const logged: Array<{ path: string; content: string }> = [];
    const deps = makeDeps({
      appendFile: (p, content) => {
        logged.push({ path: p, content });
        return ok(undefined);
      },
    });
    runAgent(makeConfig(), true, deps);
    expect(logged.some((l) => l.content.includes("dry-run"))).toBe(true);
  });

  test("does NOT call spawnSyncSafe in dry-run", () => {
    let spawnCalled = false;
    const deps = makeDeps({
      spawnSyncSafe: () => {
        spawnCalled = true;
        return ok({ stdout: "", exitCode: 0 });
      },
    });
    runAgent(makeConfig(), true, deps);
    expect(spawnCalled).toBe(false);
  });

  test("removes lock file in dry-run (via finally)", () => {
    const removed: string[] = [];
    const config = makeConfig({ lockPath: "/tmp/dry-run-test.lock" });
    const deps = makeDeps({
      removeFile: (p) => {
        removed.push(p);
        return ok(undefined);
      },
    });
    runAgent(config, true, deps);
    expect(removed).toContain("/tmp/dry-run-test.lock");
  });
});

// ─── Real Execution (stubbed) ──────────────────────────────────────────────

describe("agent-runner / real execution", () => {
  test("calls claude with correct args (-p, prompt, --max-turns, 5, --model, opus)", () => {
    let calledWith: { cmd: string; args: string[] } | null = null;
    const deps = makeDeps({
      env: {},
      spawnSyncSafe: (cmd, args) => {
        calledWith = { cmd, args };
        return ok({ stdout: "", exitCode: 0 });
      },
    });
    runAgent(makeConfig({ prompt: "do the thing", model: "opus", maxTurns: 5 }), false, deps);
    expect(calledWith).not.toBeNull();
    expect(calledWith!.cmd).toBe("claude");
    expect(calledWith!.args).toContain("-p");
    expect(calledWith!.args).toContain("do the thing");
    expect(calledWith!.args).toContain("--max-turns");
    expect(calledWith!.args).toContain("5");
    expect(calledWith!.args).toContain("--model");
    expect(calledWith!.args).toContain("opus");
  });

  test("logs completed event with exitCode", () => {
    const logged: Array<{ path: string; content: string }> = [];
    const deps = makeDeps({
      env: {},
      appendFile: (p, content) => {
        logged.push({ path: p, content });
        return ok(undefined);
      },
    });
    runAgent(makeConfig(), false, deps);
    expect(logged.some((l) => l.content.includes("completed") && l.content.includes("exitCode=0"))).toBe(true);
  });

  test("logs failed event when spawnSyncSafe returns error", () => {
    const logged: Array<{ path: string; content: string }> = [];
    const deps = makeDeps({
      env: {},
      spawnSyncSafe: () => err(processSpawnFailed("claude", new Error("timeout"))),
      appendFile: (p, content) => {
        logged.push({ path: p, content });
        return ok(undefined);
      },
    });
    runAgent(makeConfig(), false, deps);
    expect(logged.some((l) => l.content.includes("failed"))).toBe(true);
  });

  test("removes lock file after execution", () => {
    const removed: string[] = [];
    const config = makeConfig({ lockPath: "/tmp/real-test.lock" });
    const deps = makeDeps({
      env: {},
      removeFile: (p) => {
        removed.push(p);
        return ok(undefined);
      },
    });
    runAgent(config, false, deps);
    expect(removed).toContain("/tmp/real-test.lock");
  });

  test("removes lock file even when execution fails", () => {
    const removed: string[] = [];
    const config = makeConfig({ lockPath: "/tmp/fail-test.lock" });
    const deps = makeDeps({
      env: {},
      spawnSyncSafe: () => err(processSpawnFailed("claude", new Error("boom"))),
      removeFile: (p) => {
        removed.push(p);
        return ok(undefined);
      },
    });
    runAgent(config, false, deps);
    expect(removed).toContain("/tmp/fail-test.lock");
  });
});
