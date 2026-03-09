/**
 * PRDSync Contract Tests
 *
 * Covers: name/event identity, accepts() gate (tool_name + path filtering),
 * parseFrontmatter() (all key types, no frontmatter, empty values, quotes),
 * parseCriteriaCounts() (checked, unchecked, mixed, none),
 * execute() (file not found, read failure, no frontmatter, missing slug,
 * syncWorkJson with/without existing work.json, corrupt work.json, write
 * success/failure, default values for missing frontmatter fields).
 * Target: 100% branch + 100% line coverage.
 */

import { describe, it, expect } from "bun:test";
import {
  PRDSync,
  parseFrontmatter,
  parseCriteriaCounts,
  type PRDSyncDeps,
  type PRDFrontmatter,
  type WorkJson,
} from "@hooks/contracts/PRDSync";
import { ok, err } from "@hooks/core/result";
import { fileReadFailed, fileWriteFailed } from "@hooks/core/error";
import type { ToolHookInput } from "@hooks/core/types/hook-inputs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInput(
  toolName: string,
  filePath: string = "",
): ToolHookInput {
  return {
    session_id: "test-sess",
    tool_name: toolName,
    tool_input: { file_path: filePath },
  };
}

function makeDeps(
  overrides: Partial<PRDSyncDeps> = {},
): PRDSyncDeps {
  return {
    readFile: () => ok(""),
    writeFile: () => ok(undefined),
    fileExists: () => true,
    readJson: () => ok({}),
    stderr: () => {},
    baseDir: "/tmp/test",
    ...overrides,
  };
}

const SAMPLE_PRD = `---
task: "Build feature X"
slug: "feature-x"
effort: "STANDARD"
phase: "BUILD"
progress: "2/5"
mode: "interactive"
started: "2026-03-01"
updated: "2026-03-09"
---

# Feature X

## Criteria
- [x] First criterion done
- [ ] Second criterion pending
- [x] Third criterion done
`;

// ─── Identity ─────────────────────────────────────────────────────────────────

describe("PRDSync", () => {
  it("has correct name", () => {
    expect(PRDSync.name).toBe("PRDSync");
  });

  it("has correct event", () => {
    expect(PRDSync.event).toBe("PostToolUse");
  });
});

// ─── accepts() ────────────────────────────────────────────────────────────────

describe("PRDSync.accepts()", () => {
  it("accepts Write to a MEMORY/WORK/...PRD.md file", () => {
    expect(PRDSync.accepts(makeInput("Write", "/home/.claude/MEMORY/WORK/session/tasks/001/PRD.md"))).toBe(true);
  });

  it("accepts Edit to a MEMORY/WORK/...PRD.md file", () => {
    expect(PRDSync.accepts(makeInput("Edit", "/home/.claude/MEMORY/WORK/session/tasks/001/PRD.md"))).toBe(true);
  });

  it("rejects non-Write/Edit tool", () => {
    expect(PRDSync.accepts(makeInput("Read", "/home/.claude/MEMORY/WORK/session/PRD.md"))).toBe(false);
  });

  it("rejects Write to a file not ending in PRD.md", () => {
    expect(PRDSync.accepts(makeInput("Write", "/home/.claude/MEMORY/WORK/session/META.yaml"))).toBe(false);
  });

  it("rejects Write to PRD.md outside MEMORY/WORK/", () => {
    expect(PRDSync.accepts(makeInput("Write", "/home/project/docs/PRD.md"))).toBe(false);
  });

  it("rejects when tool_input has no file_path", () => {
    const input: ToolHookInput = {
      session_id: "test-sess",
      tool_name: "Write",
      tool_input: {},
    };
    expect(PRDSync.accepts(input)).toBe(false);
  });
});

// ─── parseFrontmatter() ──────────────────────────────────────────────────────

describe("parseFrontmatter()", () => {
  it("parses all supported frontmatter keys", () => {
    const fm = parseFrontmatter(SAMPLE_PRD);
    expect(fm).not.toBeNull();
    expect(fm!.task).toBe("Build feature X");
    expect(fm!.slug).toBe("feature-x");
    expect(fm!.effort).toBe("STANDARD");
    expect(fm!.phase).toBe("BUILD");
    expect(fm!.progress).toBe("2/5");
    expect(fm!.mode).toBe("interactive");
    expect(fm!.started).toBe("2026-03-01");
    expect(fm!.updated).toBe("2026-03-09");
  });

  it("returns null when no frontmatter delimiters exist", () => {
    expect(parseFrontmatter("# Just a heading\nNo frontmatter here")).toBeNull();
  });

  it("returns null for adjacent delimiters with no content between them", () => {
    // The regex requires at least one char between --- delimiters
    const fm = parseFrontmatter("---\n---\nBody");
    expect(fm).toBeNull();
  });

  it("returns empty object for delimiters with only whitespace between them", () => {
    const fm = parseFrontmatter("---\n \n---\nBody");
    expect(fm).not.toBeNull();
  });

  it("strips surrounding quotes from values", () => {
    const content = "---\ntask: 'quoted task'\nslug: \"double-quoted\"\n---";
    const fm = parseFrontmatter(content);
    expect(fm!.task).toBe("quoted task");
    expect(fm!.slug).toBe("double-quoted");
  });

  it("skips lines without a colon", () => {
    const content = "---\ntask: my-task\nno-colon-line\nslug: my-slug\n---";
    const fm = parseFrontmatter(content);
    expect(fm!.task).toBe("my-task");
    expect(fm!.slug).toBe("my-slug");
  });

  it("skips lines with empty key or empty value", () => {
    const content = "---\n: no-key\ntask:\nslug: valid\n---";
    const fm = parseFrontmatter(content);
    expect(fm!.slug).toBe("valid");
    expect(fm!.task).toBeUndefined();
  });

  it("ignores unrecognized keys", () => {
    const content = "---\nunknown_key: value\nslug: test\n---";
    const fm = parseFrontmatter(content) as PRDFrontmatter;
    expect(fm.slug).toBe("test");
    // unknown_key should not appear on the typed result
    expect(Object.keys(fm)).not.toContain("unknown_key");
  });

  it("handles \\r\\n line endings in frontmatter block", () => {
    const content = "---\r\ntask: test-task\r\nslug: test-slug\r\n---\r\nBody";
    const fm = parseFrontmatter(content);
    expect(fm!.task).toBe("test-task");
    expect(fm!.slug).toBe("test-slug");
  });
});

// ─── parseCriteriaCounts() ────────────────────────────────────────────────────

describe("parseCriteriaCounts()", () => {
  it("counts checked and unchecked criteria", () => {
    const { total, done } = parseCriteriaCounts(SAMPLE_PRD);
    expect(total).toBe(3);
    expect(done).toBe(2);
  });

  it("returns zeros when no checkboxes exist", () => {
    const { total, done } = parseCriteriaCounts("# No criteria here\nJust text.");
    expect(total).toBe(0);
    expect(done).toBe(0);
  });

  it("handles all-checked criteria", () => {
    const content = "- [x] Done 1\n- [x] Done 2\n";
    const { total, done } = parseCriteriaCounts(content);
    expect(total).toBe(2);
    expect(done).toBe(2);
  });

  it("handles all-unchecked criteria", () => {
    const content = "- [ ] Todo 1\n- [ ] Todo 2\n";
    const { total, done } = parseCriteriaCounts(content);
    expect(total).toBe(2);
    expect(done).toBe(0);
  });

  it("handles indented checkboxes", () => {
    const content = "  - [x] Done\n  - [ ] Todo\n";
    const { total, done } = parseCriteriaCounts(content);
    expect(total).toBe(2);
    expect(done).toBe(1);
  });
});

// ─── execute() — error paths ─────────────────────────────────────────────────

describe("PRDSync.execute() — error paths", () => {
  it("returns continue when PRD file does not exist on disk", () => {
    const messages: string[] = [];
    const deps = makeDeps({
      fileExists: () => false,
      stderr: (msg) => messages.push(msg),
    });
    const input = makeInput("Write", "/tmp/MEMORY/WORK/sess/PRD.md");
    const result = PRDSync.execute(input, deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("continue");
    expect(messages.some((m) => m.includes("PRD file not found"))).toBe(true);
  });

  it("returns continue when PRD file cannot be read", () => {
    const messages: string[] = [];
    const deps = makeDeps({
      readFile: () => err(fileReadFailed("/tmp/PRD.md", new Error("perm"))),
      stderr: (msg) => messages.push(msg),
    });
    const input = makeInput("Write", "/tmp/MEMORY/WORK/sess/PRD.md");
    const result = PRDSync.execute(input, deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("continue");
    expect(messages.some((m) => m.includes("Failed to read PRD"))).toBe(true);
  });

  it("returns continue when no frontmatter found", () => {
    const messages: string[] = [];
    const deps = makeDeps({
      readFile: () => ok("# Just a heading\nNo frontmatter"),
      stderr: (msg) => messages.push(msg),
    });
    const input = makeInput("Write", "/tmp/MEMORY/WORK/sess/PRD.md");
    const result = PRDSync.execute(input, deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("continue");
    expect(messages.some((m) => m.includes("No frontmatter found"))).toBe(true);
  });

  it("returns continue when frontmatter has no slug", () => {
    const messages: string[] = [];
    const deps = makeDeps({
      readFile: () => ok("---\ntask: Something\n---\nBody"),
      stderr: (msg) => messages.push(msg),
    });
    const input = makeInput("Write", "/tmp/MEMORY/WORK/sess/PRD.md");
    const result = PRDSync.execute(input, deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("continue");
    expect(messages.some((m) => m.includes("missing slug"))).toBe(true);
  });
});

// ─── execute() — syncWorkJson paths ──────────────────────────────────────────

describe("PRDSync.execute() — syncWorkJson", () => {
  it("creates new work.json when it does not exist", () => {
    let writtenPath = "";
    let writtenData: WorkJson = {};
    const deps = makeDeps({
      readFile: () => ok(SAMPLE_PRD),
      fileExists: (path) => {
        if (path.endsWith("work.json")) return false;
        return true; // PRD file exists
      },
      writeFile: (path, content) => {
        if (path.endsWith("work.json")) {
          writtenPath = path;
          writtenData = JSON.parse(content);
        }
        return ok(undefined);
      },
    });
    const input = makeInput("Write", "/tmp/MEMORY/WORK/sess/PRD.md");
    const result = PRDSync.execute(input, deps);

    expect(result.ok).toBe(true);
    expect(writtenPath).toContain("work.json");
    expect(writtenData["feature-x"]).toBeDefined();
    expect(writtenData["feature-x"].task).toBe("Build feature X");
    expect(writtenData["feature-x"].phase).toBe("BUILD");
    expect(writtenData["feature-x"].criteria_total).toBe(3);
    expect(writtenData["feature-x"].criteria_done).toBe(2);
  });

  it("merges into existing work.json", () => {
    let writtenData: WorkJson = {};
    const existing: WorkJson = {
      "other-task": {
        task: "Other", phase: "DONE", progress: "3/3",
        effort: "QUICK", mode: "interactive", started: "2026-01-01",
        updated: "2026-01-02", criteria_total: 3, criteria_done: 3,
      },
    };
    const deps = makeDeps({
      readFile: () => ok(SAMPLE_PRD),
      readJson: <T,>() => ok(existing as unknown as T),
      writeFile: (_path, content) => {
        if (content.includes("feature-x")) writtenData = JSON.parse(content);
        return ok(undefined);
      },
    });
    const input = makeInput("Write", "/tmp/MEMORY/WORK/sess/PRD.md");
    PRDSync.execute(input, deps);

    expect(writtenData["other-task"]).toBeDefined();
    expect(writtenData["feature-x"]).toBeDefined();
  });

  it("starts fresh when existing work.json is corrupt", () => {
    const messages: string[] = [];
    let writtenData: WorkJson = {};
    const deps = makeDeps({
      readFile: () => ok(SAMPLE_PRD),
      readJson: () => err(fileReadFailed("/work.json", new Error("corrupt"))),
      writeFile: (_path, content) => {
        if (content.includes("feature-x")) writtenData = JSON.parse(content);
        return ok(undefined);
      },
      stderr: (msg) => messages.push(msg),
    });
    const input = makeInput("Write", "/tmp/MEMORY/WORK/sess/PRD.md");
    PRDSync.execute(input, deps);

    expect(messages.some((m) => m.includes("starting fresh"))).toBe(true);
    expect(writtenData["feature-x"]).toBeDefined();
  });

  it("logs error when work.json write fails", () => {
    const messages: string[] = [];
    const deps = makeDeps({
      readFile: () => ok(SAMPLE_PRD),
      fileExists: (path) => {
        if (path.endsWith("work.json")) return false;
        return true;
      },
      writeFile: (path) => {
        if (path.endsWith("work.json")) {
          return err(fileWriteFailed("/work.json", new Error("disk full")));
        }
        return ok(undefined);
      },
      stderr: (msg) => messages.push(msg),
    });
    const input = makeInput("Write", "/tmp/MEMORY/WORK/sess/PRD.md");
    const result = PRDSync.execute(input, deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("continue");
    expect(messages.some((m) => m.includes("Failed to write work.json"))).toBe(true);
  });

  it("logs success after syncing", () => {
    const messages: string[] = [];
    const deps = makeDeps({
      readFile: () => ok(SAMPLE_PRD),
      fileExists: (path) => {
        if (path.endsWith("work.json")) return false;
        return true;
      },
      stderr: (msg) => messages.push(msg),
    });
    const input = makeInput("Write", "/tmp/MEMORY/WORK/sess/PRD.md");
    PRDSync.execute(input, deps);

    expect(messages.some((m) => m.includes("Synced feature-x"))).toBe(true);
  });
});

// ─── execute() — default values for missing frontmatter fields ───────────────

describe("PRDSync.execute() — defaults for missing fields", () => {
  it("uses defaults when optional frontmatter fields are missing", () => {
    let writtenData: WorkJson = {};
    const minimalPRD = "---\nslug: minimal\n---\nBody";
    const deps = makeDeps({
      readFile: () => ok(minimalPRD),
      fileExists: (path) => {
        if (path.endsWith("work.json")) return false;
        return true;
      },
      writeFile: (_path, content) => {
        if (content.includes("minimal")) writtenData = JSON.parse(content);
        return ok(undefined);
      },
    });
    const input = makeInput("Write", "/tmp/MEMORY/WORK/sess/PRD.md");
    PRDSync.execute(input, deps);

    const entry = writtenData["minimal"];
    expect(entry).toBeDefined();
    expect(entry.task).toBe("");
    expect(entry.phase).toBe("");
    expect(entry.progress).toBe("0/0");
    expect(entry.effort).toBe("");
    expect(entry.mode).toBe("");
    expect(entry.started).toBe("");
    // updated defaults to new Date().toISOString() — just verify it exists
    expect(entry.updated.length).toBeGreaterThan(0);
    expect(entry.criteria_total).toBe(0);
    expect(entry.criteria_done).toBe(0);
  });

  it("uses frontmatter progress over computed when provided", () => {
    let writtenData: WorkJson = {};
    const prdWithProgress = "---\nslug: prog\nprogress: 5/10\n---\n- [x] one\n- [ ] two";
    const deps = makeDeps({
      readFile: () => ok(prdWithProgress),
      fileExists: (path) => {
        if (path.endsWith("work.json")) return false;
        return true;
      },
      writeFile: (_path, content) => {
        if (content.includes("prog")) writtenData = JSON.parse(content);
        return ok(undefined);
      },
    });
    const input = makeInput("Write", "/tmp/MEMORY/WORK/sess/PRD.md");
    PRDSync.execute(input, deps);

    expect(writtenData["prog"].progress).toBe("5/10");
  });
});
