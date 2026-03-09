/**
 * WorkCompletionLearning Contract Tests
 *
 * Covers: name/event identity, accepts() (always true), execute() with all
 * branches (no session_id, no state file, failed state read, session mismatch,
 * no session_dir, no META.yaml, YAML parsing, ISC reading with criteria/
 * anti-criteria/satisfaction, trivial work skip, significant work detection,
 * duration calculation, existing learning file skip, write success/failure,
 * parseYaml edge cases).
 * Target: 100% branch + 100% line coverage.
 */

import { describe, it, expect } from "bun:test";
import {
  WorkCompletionLearning,
  type WorkCompletionLearningDeps,
} from "@hooks/contracts/WorkCompletionLearning";
import { ok, err } from "@hooks/core/result";
import { fileReadFailed, fileWriteFailed } from "@hooks/core/error";
import type { SessionEndInput } from "@hooks/core/types/hook-inputs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInput(sessionId?: string): SessionEndInput {
  return {
    session_id: sessionId || "test-sess",
  };
}

const CURRENT_WORK = {
  session_id: "test-sess",
  session_dir: "20260309-143000_build-auth",
  current_task: "001_build-auth",
  task_title: "Build auth",
  task_count: 1,
  created_at: "2026-03-09T14:30:00",
};

const META_YAML = [
  'title: "Build Auth System"',
  'created_at: "2026-03-09T14:30:00"',
  "completed_at: null",
  'source: "MANUAL"',
  'session_id: "test-sess"',
  "lineage:",
  "  tools_used:",
  '    - "Write"',
  '    - "Edit"',
  "  files_changed:",
  '    - "src/auth.ts"',
  "  agents_spawned: []",
].join("\n");

function makeDeps(
  overrides: Partial<WorkCompletionLearningDeps> = {},
): WorkCompletionLearningDeps {
  return {
    fileExists: (path) => {
      if (path.includes("current-work-")) return true;
      if (path.endsWith(".md")) return false; // learning file doesn't exist yet
      return false;
    },
    readFile: () => ok(META_YAML),
    readJson: <T,>(path: string) => {
      if (path.includes("current-work-")) return ok(CURRENT_WORK as unknown as T);
      if (path.endsWith("ISC.json")) return err(fileReadFailed(path, new Error("not found")));
      return err(fileReadFailed(path, new Error("not found")));
    },
    writeFile: () => ok(undefined),
    ensureDir: () => ok(undefined),
    getTimestamp: () => "2026-03-09T15:00:00+00:00",
    getLocalDate: () => "2026-03-09",
    getLearningCategory: () => "ALGORITHM",
    baseDir: "/tmp/test",
    stderr: () => {},
    ...overrides,
  };
}

// ─── Identity ─────────────────────────────────────────────────────────────────

describe("WorkCompletionLearning", () => {
  it("has correct name", () => {
    expect(WorkCompletionLearning.name).toBe("WorkCompletionLearning");
  });

  it("has correct event", () => {
    expect(WorkCompletionLearning.event).toBe("SessionEnd");
  });
});

// ─── accepts() ────────────────────────────────────────────────────────────────

describe("WorkCompletionLearning.accepts()", () => {
  it("always accepts", () => {
    expect(WorkCompletionLearning.accepts(makeInput())).toBe(true);
    expect(WorkCompletionLearning.accepts(makeInput("any-session"))).toBe(true);
  });
});

// ─── execute() — no state file found ─────────────────────────────────────────

describe("WorkCompletionLearning.execute() — no state file", () => {
  it("returns silent when no session_id provided and no state file", () => {
    const messages: string[] = [];
    const deps = makeDeps({
      fileExists: () => false,
      stderr: (msg) => messages.push(msg),
    });
    // session_id is empty string, which is falsy
    const input: SessionEndInput = { session_id: "" };
    const result = WorkCompletionLearning.execute(input, deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
    expect(messages.some((m) => m.includes("No active work session"))).toBe(true);
  });

  it("returns silent when session_id provided but scoped file does not exist", () => {
    const messages: string[] = [];
    const deps = makeDeps({
      fileExists: () => false,
      stderr: (msg) => messages.push(msg),
    });
    const result = WorkCompletionLearning.execute(makeInput("sess-xyz"), deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
    expect(messages.some((m) => m.includes("No active work session"))).toBe(true);
  });
});

// ─── execute() — state file read failure ─────────────────────────────────────

describe("WorkCompletionLearning.execute() — state file read failure", () => {
  it("returns silent when state file cannot be parsed", () => {
    const messages: string[] = [];
    const deps = makeDeps({
      fileExists: (path) => path.includes("current-work-"),
      readJson: () => err(fileReadFailed("/state.json", new Error("corrupt"))),
      stderr: (msg) => messages.push(msg),
    });
    const result = WorkCompletionLearning.execute(makeInput(), deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
    expect(messages.some((m) => m.includes("Failed to read state file"))).toBe(true);
  });
});

// ─── execute() — session mismatch ────────────────────────────────────────────

describe("WorkCompletionLearning.execute() — session mismatch", () => {
  it("returns silent when state file belongs to different session", () => {
    const messages: string[] = [];
    const mismatchedWork = { ...CURRENT_WORK, session_id: "other-sess" };
    const deps = makeDeps({
      fileExists: (path) => path.includes("current-work-"),
      readJson: <T,>() => ok(mismatchedWork as unknown as T),
      stderr: (msg) => messages.push(msg),
    });
    const result = WorkCompletionLearning.execute(makeInput("test-sess"), deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
    expect(messages.some((m) => m.includes("different session"))).toBe(true);
  });
});

// ─── execute() — no session_dir ──────────────────────────────────────────────

describe("WorkCompletionLearning.execute() — no session_dir", () => {
  it("returns silent when currentWork has no session_dir", () => {
    const messages: string[] = [];
    const noDir = { ...CURRENT_WORK, session_dir: "" };
    const deps = makeDeps({
      fileExists: (path) => path.includes("current-work-"),
      readJson: <T,>() => ok(noDir as unknown as T),
      stderr: (msg) => messages.push(msg),
    });
    const result = WorkCompletionLearning.execute(makeInput(), deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
    expect(messages.some((m) => m.includes("No work directory"))).toBe(true);
  });
});

// ─── execute() — no META.yaml ────────────────────────────────────────────────

describe("WorkCompletionLearning.execute() — no META.yaml", () => {
  it("returns silent when META.yaml cannot be read", () => {
    const messages: string[] = [];
    const deps = makeDeps({
      fileExists: (path) => path.includes("current-work-"),
      readFile: () => err(fileReadFailed("/META.yaml", new Error("not found"))),
      stderr: (msg) => messages.push(msg),
    });
    const result = WorkCompletionLearning.execute(makeInput(), deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
    expect(messages.some((m) => m.includes("No META.yaml found"))).toBe(true);
  });
});

// ─── execute() — trivial work skip ───────────────────────────────────────────

describe("WorkCompletionLearning.execute() — trivial work", () => {
  it("skips when no files changed, task_count is 1, and source is not MANUAL", () => {
    const messages: string[] = [];
    const trivialMeta = [
      'title: "Quick question"',
      'created_at: "2026-03-09T14:30:00"',
      "completed_at: null",
      'source: "AUTO"',
      'session_id: "test-sess"',
    ].join("\n");
    const deps = makeDeps({
      fileExists: (path) => path.includes("current-work-"),
      readFile: () => ok(trivialMeta),
      stderr: (msg) => messages.push(msg),
    });
    const result = WorkCompletionLearning.execute(makeInput(), deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
    expect(messages.some((m) => m.includes("Trivial work session"))).toBe(true);
  });
});

// ─── execute() — significant work detection ──────────────────────────────────

describe("WorkCompletionLearning.execute() — significant work", () => {
  it("detects significant work via files_changed", () => {
    const messages: string[] = [];
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      stderr: (msg) => messages.push(msg),
    });
    const result = WorkCompletionLearning.execute(makeInput(), deps);

    expect(result.ok).toBe(true);
    expect(messages.some((m) => m.includes("Created learning"))).toBe(true);
  });

  it("detects significant work via task_count > 1", () => {
    const messages: string[] = [];
    const multiTask = { ...CURRENT_WORK, task_count: 3 };
    const noFilesMeta = [
      'title: "Multi task work"',
      'created_at: "2026-03-09T14:30:00"',
      "completed_at: null",
      'source: "AUTO"',
      'session_id: "test-sess"',
    ].join("\n");
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      readFile: () => ok(noFilesMeta),
      readJson: <T,>(path: string) => {
        if (path.includes("current-work-")) return ok(multiTask as unknown as T);
        return err(fileReadFailed(path, new Error("not found")));
      },
      stderr: (msg) => messages.push(msg),
    });
    const result = WorkCompletionLearning.execute(makeInput(), deps);

    expect(result.ok).toBe(true);
    expect(messages.some((m) => m.includes("Created learning"))).toBe(true);
  });

  it("detects significant work via source MANUAL", () => {
    const messages: string[] = [];
    const manualMeta = [
      'title: "Manual task"',
      'created_at: "2026-03-09T14:30:00"',
      "completed_at: null",
      'source: "MANUAL"',
      'session_id: "test-sess"',
    ].join("\n");
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      readFile: () => ok(manualMeta),
      stderr: (msg) => messages.push(msg),
    });
    const result = WorkCompletionLearning.execute(makeInput(), deps);

    expect(result.ok).toBe(true);
    expect(messages.some((m) => m.includes("Created learning"))).toBe(true);
  });
});

// ─── execute() — ISC reading ─────────────────────────────────────────────────

describe("WorkCompletionLearning.execute() — ISC integration", () => {
  it("includes criteria from ISC in learning file", () => {
    let writtenContent = "";
    const iscData = {
      current: {
        criteria: ["Unit tests pass", "Coverage above 90%"],
        antiCriteria: ["No hardcoded values"],
      },
      satisfaction: { satisfied: 2, total: 3, partial: 0, failed: 1 },
    };
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      readJson: <T,>(path: string) => {
        if (path.includes("current-work-")) return ok(CURRENT_WORK as unknown as T);
        if (path.endsWith("ISC.json")) return ok(iscData as unknown as T);
        return err(fileReadFailed(path, new Error("not found")));
      },
      writeFile: (_path, content) => { writtenContent = content; return ok(undefined); },
    });
    WorkCompletionLearning.execute(makeInput(), deps);

    expect(writtenContent).toContain("Unit tests pass");
    expect(writtenContent).toContain("Coverage above 90%");
    expect(writtenContent).toContain("No hardcoded values");
    expect(writtenContent).toContain("2/3 satisfied");
    expect(writtenContent).toContain("1 failed");
  });

  it("includes criteria without anti-criteria or satisfaction", () => {
    let writtenContent = "";
    const iscData = {
      current: {
        criteria: ["Tests pass"],
        antiCriteria: [],
      },
    };
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      readJson: <T,>(path: string) => {
        if (path.includes("current-work-")) return ok(CURRENT_WORK as unknown as T);
        if (path.endsWith("ISC.json")) return ok(iscData as unknown as T);
        return err(fileReadFailed(path, new Error("not found")));
      },
      writeFile: (_path, content) => { writtenContent = content; return ok(undefined); },
    });
    WorkCompletionLearning.execute(makeInput(), deps);

    expect(writtenContent).toContain("Tests pass");
    expect(writtenContent).not.toContain("Anti-Criteria");
    expect(writtenContent).not.toContain("Satisfaction");
  });

  it("handles ISC with empty criteria arrays", () => {
    let writtenContent = "";
    const iscData = {
      current: {
        criteria: [],
        antiCriteria: [],
      },
    };
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      readJson: <T,>(path: string) => {
        if (path.includes("current-work-")) return ok(CURRENT_WORK as unknown as T);
        if (path.endsWith("ISC.json")) return ok(iscData as unknown as T);
        return err(fileReadFailed(path, new Error("not found")));
      },
      writeFile: (_path, content) => { writtenContent = content; return ok(undefined); },
    });
    WorkCompletionLearning.execute(makeInput(), deps);

    expect(writtenContent).toContain("Not specified");
  });
});

// ─── execute() — duration calculation ────────────────────────────────────────

describe("WorkCompletionLearning.execute() — duration", () => {
  it("calculates duration in minutes when under 60", () => {
    let writtenContent = "";
    const metaWithTimes = [
      'title: "Short task"',
      'created_at: "2026-03-09T14:00:00Z"',
      'completed_at: "2026-03-09T14:30:00Z"',
      'source: "MANUAL"',
      'session_id: "test-sess"',
    ].join("\n");
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      readFile: () => ok(metaWithTimes),
      writeFile: (_path, content) => { writtenContent = content; return ok(undefined); },
    });
    WorkCompletionLearning.execute(makeInput(), deps);

    expect(writtenContent).toContain("30 minutes");
  });

  it("calculates duration in hours and minutes when >= 60", () => {
    let writtenContent = "";
    const metaWithTimes = [
      'title: "Long task"',
      'created_at: "2026-03-09T12:00:00Z"',
      'completed_at: "2026-03-09T14:30:00Z"',
      'source: "MANUAL"',
      'session_id: "test-sess"',
    ].join("\n");
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      readFile: () => ok(metaWithTimes),
      writeFile: (_path, content) => { writtenContent = content; return ok(undefined); },
    });
    WorkCompletionLearning.execute(makeInput(), deps);

    expect(writtenContent).toContain("2h 30m");
  });

  it("uses completed_at from getTimestamp when META has null", () => {
    let writtenContent = "";
    const metaNullComplete = [
      'title: "No complete time"',
      'created_at: "2026-03-09T14:00:00Z"',
      "completed_at: null",
      'source: "MANUAL"',
      'session_id: "test-sess"',
    ].join("\n");
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      readFile: () => ok(metaNullComplete),
      getTimestamp: () => "2026-03-09T15:00:00Z",
      writeFile: (_path, content) => { writtenContent = content; return ok(undefined); },
    });
    WorkCompletionLearning.execute(makeInput(), deps);

    // 60 minutes >= 60, so it formats as hours
    expect(writtenContent).toContain("1h 0m");
  });

  it("shows Unknown duration when created_at is missing", () => {
    let writtenContent = "";
    const metaNoCreated = [
      'title: "No times"',
      'source: "MANUAL"',
      'session_id: "test-sess"',
    ].join("\n");
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      readFile: () => ok(metaNoCreated),
      writeFile: (_path, content) => { writtenContent = content; return ok(undefined); },
    });
    WorkCompletionLearning.execute(makeInput(), deps);

    expect(writtenContent).toContain("Unknown");
  });
});

// ─── execute() — existing learning file ──────────────────────────────────────

describe("WorkCompletionLearning.execute() — existing learning file", () => {
  it("skips when learning file already exists", () => {
    const messages: string[] = [];
    const deps = makeDeps({
      fileExists: () => true, // both state file and learning file exist
      stderr: (msg) => messages.push(msg),
    });
    const result = WorkCompletionLearning.execute(makeInput(), deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
    expect(messages.some((m) => m.includes("Learning already exists"))).toBe(true);
  });
});

// ─── execute() — write failure ───────────────────────────────────────────────

describe("WorkCompletionLearning.execute() — write failure", () => {
  it("returns silent and logs when write fails", () => {
    const messages: string[] = [];
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      writeFile: () => err(fileWriteFailed("/learning.md", new Error("disk full"))),
      stderr: (msg) => messages.push(msg),
    });
    const result = WorkCompletionLearning.execute(makeInput(), deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
    expect(messages.some((m) => m.includes("Failed to write"))).toBe(true);
  });
});

// ─── execute() — learning content ────────────────────────────────────────────

describe("WorkCompletionLearning.execute() — learning content", () => {
  it("includes title, duration, category, session info in output", () => {
    let writtenContent = "";
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      writeFile: (_path, content) => { writtenContent = content; return ok(undefined); },
      getLearningCategory: () => "SYSTEM",
    });
    WorkCompletionLearning.execute(makeInput(), deps);

    expect(writtenContent).toContain("Build Auth System");
    expect(writtenContent).toContain("SYSTEM");
    expect(writtenContent).toContain("test-sess");
    expect(writtenContent).toContain("Files Changed:");
    expect(writtenContent).toContain("Tools Used:");
    expect(writtenContent).toContain("Agents Spawned:");
    expect(writtenContent).toContain("Auto-captured by WorkCompletionLearning");
  });

  it("handles META with lineage tools and agents info", () => {
    let writtenContent = "";
    // The YAML parser uses Object.keys(meta.lineage).pop() to find which
    // sub-key to push array items into. Items always go to the last key
    // in insertion order (agents_spawned). Use inline values for tools_used
    // and files_changed to test those paths independently.
    const metaWithAgents = [
      'title: "Agent work"',
      'created_at: "2026-03-09T14:00:00Z"',
      'completed_at: "2026-03-09T14:30:00Z"',
      'source: "AUTO"',
      'session_id: "test-sess"',
      "lineage:",
      "  tools_used: Write",
      "  files_changed: src/app.ts",
      "  agents_spawned:",
      '    - "designer"',
    ].join("\n");
    const multiTaskWork = { ...CURRENT_WORK, task_count: 2 };
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      readFile: () => ok(metaWithAgents),
      readJson: <T,>(path: string) => {
        if (path.includes("current-work-")) return ok(multiTaskWork as unknown as T);
        return err(fileReadFailed(path, new Error("not found")));
      },
      writeFile: (_path, content) => { writtenContent = content; return ok(undefined); },
    });
    WorkCompletionLearning.execute(makeInput(), deps);

    expect(writtenContent).toContain("Write");
    expect(writtenContent).toContain("Files Changed:** 1");
    expect(writtenContent).toContain("Agents Spawned:** 1");
  });
});

// ─── parseYaml edge cases (exercised through execute) ────────────────────────

describe("WorkCompletionLearning — YAML parsing edge cases", () => {
  it("handles empty array syntax []", () => {
    let writtenContent = "";
    const metaEmptyArrays = [
      'title: "Empty arrays"',
      'created_at: "2026-03-09T14:00:00Z"',
      'completed_at: "2026-03-09T14:30:00Z"',
      'source: "MANUAL"',
      'session_id: "test-sess"',
      "lineage:",
      "  tools_used: []",
      "  files_changed: []",
      "  agents_spawned: []",
    ].join("\n");
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      readFile: () => ok(metaEmptyArrays),
      writeFile: (_path, content) => { writtenContent = content; return ok(undefined); },
    });
    WorkCompletionLearning.execute(makeInput(), deps);

    expect(writtenContent).toContain("Files Changed:** 0");
    expect(writtenContent).toContain("None tracked");
  });

  it("handles inline single values for lineage fields", () => {
    let writtenContent = "";
    const metaInlineLineage = [
      'title: "Inline lineage"',
      'created_at: "2026-03-09T14:00:00Z"',
      'completed_at: "2026-03-09T14:30:00Z"',
      'source: "MANUAL"',
      'session_id: "test-sess"',
      "lineage:",
      "  tools_used: Write",
      "  files_changed: src/main.ts",
      "  agents_spawned: null",
    ].join("\n");
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      readFile: () => ok(metaInlineLineage),
      writeFile: (_path, content) => { writtenContent = content; return ok(undefined); },
    });
    WorkCompletionLearning.execute(makeInput(), deps);

    expect(writtenContent).toContain("Files Changed:** 1");
    expect(writtenContent).toContain("Write");
  });

  it("skips comments and blank lines in YAML", () => {
    let writtenContent = "";
    const metaWithComments = [
      "# This is a comment",
      "",
      'title: "With comments"',
      '  ',
      'source: "MANUAL"',
      'session_id: "test-sess"',
    ].join("\n");
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      readFile: () => ok(metaWithComments),
      writeFile: (_path, content) => { writtenContent = content; return ok(undefined); },
    });
    WorkCompletionLearning.execute(makeInput(), deps);

    expect(writtenContent).toContain("With comments");
  });

  it("handles top-level empty array value", () => {
    let writtenContent = "";
    const metaTopArray = [
      'title: "Top array"',
      'source: "MANUAL"',
      'session_id: "test-sess"',
      "tags: []",
    ].join("\n");
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      readFile: () => ok(metaTopArray),
      writeFile: (_path, content) => { writtenContent = content; return ok(undefined); },
    });
    WorkCompletionLearning.execute(makeInput(), deps);

    expect(writtenContent).toContain("Top array");
  });

  it("handles top-level array with items", () => {
    let writtenContent = "";
    const metaTopArrayItems = [
      'title: "Top items"',
      'source: "MANUAL"',
      'session_id: "test-sess"',
      "tags:",
      '  - "tag1"',
      '  - "tag2"',
    ].join("\n");
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.includes("current-work-")) return true;
        return false;
      },
      readFile: () => ok(metaTopArrayItems),
      writeFile: (_path, content) => { writtenContent = content; return ok(undefined); },
    });
    WorkCompletionLearning.execute(makeInput(), deps);

    expect(writtenContent).toContain("Top items");
  });
});
