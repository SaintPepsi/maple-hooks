/**
 * CronPrune Contract Tests — TDD RED phase.
 *
 * Validates that stale session cron files are pruned on SessionStart
 * while fresh files are left intact.
 */

import { describe, it, expect } from "bun:test";
import { CronPrune, PRUNE_THRESHOLD_MS, type CronPruneDeps } from "./CronPrune.contract";
import type { SessionStartInput } from "@hooks/core/types/hook-inputs";
import type { CronSessionFile } from "@hooks/hooks/CronStatusLine/shared";
import { ok, err } from "@hooks/core/result";
import { PaiError, ErrorCode } from "@hooks/core/error";

// ─── Test Helpers ────────────────────────────────────────────────────────────

const FIVE_MINUTES_AGO = Date.now() - PRUNE_THRESHOLD_MS - 1000;
const ONE_MINUTE_AGO = Date.now() - 60_000;

function makeDeps(overrides: Partial<CronPruneDeps> = {}): CronPruneDeps {
  return {
    getEnv: (key: string) => {
      if (key === "PAI_DIR") return "/tmp/test-pai";
      if (key === "HOME") return "/tmp";
      return undefined;
    },
    readFile: () => ok(JSON.stringify({ sessionId: "dead-session", crons: [{ id: "c1", name: "test", schedule: "* * * * *", recurring: true, prompt: "hello", createdAt: 0, fireCount: 0, lastFired: null }] })),
    writeFile: () => ok(undefined),
    fileExists: () => true,
    ensureDir: () => ok(undefined),
    readDir: () => ok(["dead-session.json"]),
    removeFile: () => ok(undefined),
    appendFile: () => ok(undefined),
    stderr: () => {},
    now: () => Date.now(),
    stat: () => ok({ mtimeMs: FIVE_MINUTES_AGO }),
    ...overrides,
  };
}

function makeInput(sessionId = "current-session"): SessionStartInput {
  return { session_id: sessionId };
}

// ─── Contract Metadata ──────────────────────────────────────────────────────

describe("CronPrune contract", () => {
  it("has correct name and event", () => {
    expect(CronPrune.name).toBe("CronPrune");
    expect(CronPrune.event).toBe("SessionStart");
  });

  it("accepts() always returns true", () => {
    expect(CronPrune.accepts(makeInput())).toBe(true);
    expect(CronPrune.accepts(makeInput("other"))).toBe(true);
  });
});

// ─── Pruning Logic ──────────────────────────────────────────────────────────

describe("CronPrune execute", () => {
  it("removes files older than 5 minutes", () => {
    const removed: string[] = [];
    const deps = makeDeps({
      removeFile: (path: string) => { removed.push(path); return ok(undefined); },
    });

    const result = CronPrune.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    expect(removed.length).toBe(1);
    expect(removed[0]).toContain("dead-session.json");
  });

  it("keeps files younger than 5 minutes", () => {
    const removed: string[] = [];
    const deps = makeDeps({
      stat: () => ok({ mtimeMs: ONE_MINUTE_AGO }),
      removeFile: (path: string) => { removed.push(path); return ok(undefined); },
    });

    const result = CronPrune.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    expect(removed.length).toBe(0);
  });

  it("no-op when crons directory does not exist", () => {
    const removed: string[] = [];
    const deps = makeDeps({
      fileExists: () => false,
      readDir: () => err(new PaiError(ErrorCode.FileReadFailed, "no such dir")),
      removeFile: (path: string) => { removed.push(path); return ok(undefined); },
    });

    const result = CronPrune.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("silent");
    }
    expect(removed.length).toBe(0);
  });

  it("logs pruned event with session ID and cron count", () => {
    const logged: string[] = [];
    const sessionFile: CronSessionFile = {
      sessionId: "dead-session",
      crons: [
        { id: "c1", name: "test1", schedule: "* * * * *", recurring: true, prompt: "p1", createdAt: 0, fireCount: 0, lastFired: null },
        { id: "c2", name: "test2", schedule: "*/5 * * * *", recurring: true, prompt: "p2", createdAt: 0, fireCount: 0, lastFired: null },
      ],
    };
    const deps = makeDeps({
      readFile: () => ok(JSON.stringify(sessionFile)),
      appendFile: (_path: string, content: string) => { logged.push(content); return ok(undefined); },
    });

    const result = CronPrune.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    expect(logged.length).toBe(1);

    const event = JSON.parse(logged[0]);
    expect(event.type).toBe("pruned");
    expect(event.sessionId).toBe("dead-session");
    expect(event.cronCount).toBe(2);
    expect(event.reason).toBe("session_dead");
  });

  it("handles stat failures gracefully — skips file, does not crash", () => {
    const removed: string[] = [];
    const deps = makeDeps({
      readDir: () => ok(["bad-file.json", "good-file.json"]),
      stat: (path: string) => {
        if (path.includes("bad-file")) {
          return err(new PaiError(ErrorCode.FileReadFailed, "stat failed"));
        }
        return ok({ mtimeMs: FIVE_MINUTES_AGO });
      },
      removeFile: (path: string) => { removed.push(path); return ok(undefined); },
    });

    const result = CronPrune.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    // Only the good file was removed, bad file was skipped
    expect(removed.length).toBe(1);
    expect(removed[0]).toContain("good-file.json");
  });

  it("handles multiple stale files in one pass", () => {
    const removed: string[] = [];
    const deps = makeDeps({
      readDir: () => ok(["session-a.json", "session-b.json", "session-c.json"]),
      removeFile: (path: string) => { removed.push(path); return ok(undefined); },
    });

    const result = CronPrune.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    expect(removed.length).toBe(3);
  });

  it("ignores non-.json files in crons directory", () => {
    const removed: string[] = [];
    const deps = makeDeps({
      readDir: () => ok(["readme.txt", ".gitkeep", "session.json"]),
      removeFile: (path: string) => { removed.push(path); return ok(undefined); },
    });

    const result = CronPrune.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    // Only the .json file should be considered
    expect(removed.length).toBe(1);
    expect(removed[0]).toContain("session.json");
  });

  it("returns silent output on success", () => {
    const deps = makeDeps();
    const result = CronPrune.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("silent");
    }
  });
});
