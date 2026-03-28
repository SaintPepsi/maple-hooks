import { describe, it, expect } from "bun:test";
import { AgentList, formatListContent } from "./AgentList.contract";
import type { AgentListDeps } from "./AgentList.contract";
import type { SessionStartInput } from "@hooks/core/types/hook-inputs";
import { ok, err } from "@hooks/core/result";
import { ErrorCode } from "@hooks/core/error";
import type { PaiError } from "@hooks/core/error";

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeInput(overrides: Partial<SessionStartInput> = {}): SessionStartInput {
  return { session_id: "test-session", ...overrides };
}

function makeDeps(overrides: Partial<AgentListDeps> = {}): AgentListDeps {
  return {
    fileExists: () => false,
    readFile: () => err({ code: ErrorCode.FileNotFound, message: "not found" } as PaiError),
    readJson: () => err({ code: ErrorCode.FileNotFound, message: "not found" } as PaiError),
    isSubagent: () => false,
    baseDir: "/test/.claude",
    stderr: () => {},
    ...overrides,
  };
}

// ─── Contract Metadata ──────────────────────────────────────────────────────

describe("AgentList contract metadata", () => {
  it("has correct name and event", () => {
    expect(AgentList.name).toBe("AgentList");
    expect(AgentList.event).toBe("SessionStart");
  });

  it("accepts all SessionStart inputs", () => {
    expect(AgentList.accepts(makeInput())).toBe(true);
  });
});

// ─── Subagent Skipping ──────────────────────────────────────────────────────

describe("AgentList subagent handling", () => {
  it("returns silent for subagents", () => {
    const deps = makeDeps({ isSubagent: () => true });
    const result = AgentList.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
  });
});

// ─── Config Loading ─────────────────────────────────────────────────────────

describe("AgentList config", () => {
  it("returns silent when disabled via config", () => {
    const deps = makeDeps({
      fileExists: (p) => p === "/test/.claude/PAI/agent-list-config.json",
      readJson: () => ok({ enabled: false }),
    });
    const result = AgentList.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
  });

  it("uses custom list paths from config", () => {
    const deps = makeDeps({
      fileExists: (p) =>
        p === "/test/.claude/PAI/agent-list-config.json" ||
        p === "/test/.claude/custom/my-list.md",
      readJson: () => ok({ listFiles: ["custom/my-list.md"] }),
      readFile: (p) => {
        if (p === "/test/.claude/custom/my-list.md") {
          return ok("- Custom task 1\n- Custom task 2");
        }
        return err({ code: ErrorCode.FileNotFound, message: "not found" } as PaiError);
      },
    });
    const result = AgentList.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("context");
      if (result.value.type === "context") {
        expect(result.value.content).toContain("Custom task 1");
      }
    }
  });
});

// ─── List File Loading ──────────────────────────────────────────────────────

describe("AgentList file loading", () => {
  it("returns silent when no list file exists", () => {
    const deps = makeDeps({ fileExists: () => false });
    const result = AgentList.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
  });

  it("loads from PAI/AGENT-LIST.md (first default path)", () => {
    const deps = makeDeps({
      fileExists: (p) => p === "/test/.claude/PAI/AGENT-LIST.md",
      readFile: () => ok("- Task A\n- Task B"),
    });
    const result = AgentList.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("context");
      if (result.value.type === "context") {
        expect(result.value.content).toContain("Task A");
        expect(result.value.content).toContain("Task B");
      }
    }
  });

  it("falls back to MEMORY/STATE/agent-list.md", () => {
    const deps = makeDeps({
      fileExists: (p) => p === "/test/.claude/MEMORY/STATE/agent-list.md",
      readFile: () => ok("- Fallback task"),
    });
    const result = AgentList.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("context");
      if (result.value.type === "context") {
        expect(result.value.content).toContain("Fallback task");
      }
    }
  });

  it("returns silent when list file is empty", () => {
    const deps = makeDeps({
      fileExists: (p) => p === "/test/.claude/PAI/AGENT-LIST.md",
      readFile: () => ok("   \n  \n  "),
    });
    const result = AgentList.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
  });

  it("returns silent when readFile fails", () => {
    const deps = makeDeps({
      fileExists: (p) => p === "/test/.claude/PAI/AGENT-LIST.md",
      readFile: () => err({ code: ErrorCode.FileReadFailed, message: "permission denied" } as PaiError),
    });
    const result = AgentList.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("silent");
  });
});

// ─── Format Function ────────────────────────────────────────────────────────

describe("formatListContent", () => {
  it("wraps content in system-reminder tags", () => {
    const result = formatListContent("- Item 1\n- Item 2");
    expect(result).toContain("<system-reminder>");
    expect(result).toContain("</system-reminder>");
    expect(result).toContain("Agent Checklist");
    expect(result).toContain("- Item 1");
  });

  it("returns empty string for blank input", () => {
    expect(formatListContent("")).toBe("");
    expect(formatListContent("   \n  ")).toBe("");
  });

  it("trims whitespace from content", () => {
    const result = formatListContent("\n\n  - Item  \n\n");
    expect(result).toContain("- Item");
    expect(result).not.toMatch(/^\s*\n\s*\n\s*- Item/);
  });
});
