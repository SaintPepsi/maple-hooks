import { describe, it, expect } from "bun:test";
import { QuestionAnswered, type QuestionAnsweredDeps } from "@hooks/contracts/QuestionAnswered";
import type { ToolHookInput } from "@hooks/core/types/hook-inputs";
import type { SilentOutput } from "@hooks/core/types/hook-outputs";
import type { Result } from "@hooks/core/result";
import type { PaiError } from "@hooks/core/error";

interface TabStateCall {
  title: string;
  state: string;
  sessionId: string;
}

function makeDeps(overrides: Partial<QuestionAnsweredDeps> = {}): QuestionAnsweredDeps {
  return {
    setTabState: () => {},
    readTabState: () => null,
    stripPrefix: (s: string) => s,
    stderr: () => {},
    ...overrides,
  };
}

function makeInput(): ToolHookInput {
  return {
    session_id: "test",
    tool_name: "AskUserQuestion",
    tool_input: {},
  };
}

describe("QuestionAnswered", () => {
  it("has correct name and event", () => {
    expect(QuestionAnswered.name).toBe("QuestionAnswered");
    expect(QuestionAnswered.event).toBe("PostToolUse");
  });

  it("accepts all inputs", () => {
    expect(QuestionAnswered.accepts(makeInput())).toBe(true);
  });

  it("returns silent output", () => {
    const deps = makeDeps();
    const result = QuestionAnswered.execute(makeInput(), deps) as Result<SilentOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("silent");
    }
  });

  it("restores previous title when available", () => {
    let capturedState: TabStateCall | null = null;
    const deps = makeDeps({
      setTabState: (state: TabStateCall) => { capturedState = state; },
      readTabState: () => ({ title: "teal title", previousTitle: "Old Working Title", state: "question" }),
      stripPrefix: (s: string) => s,
    });
    QuestionAnswered.execute(makeInput(), deps);
    expect(capturedState).not.toBeNull();
    expect(capturedState!.state).toBe("working");
    expect(capturedState!.title).toContain("Old Working Title");
  });

  it("uses fallback when no previous title", () => {
    let capturedState: TabStateCall | null = null;
    const deps = makeDeps({
      setTabState: (state: TabStateCall) => { capturedState = state; },
    });
    QuestionAnswered.execute(makeInput(), deps);
    expect(capturedState).not.toBeNull();
    expect(capturedState!.title).toContain("Processing answer");
  });

  it("uses fallback when readTabState returns null", () => {
    let capturedState: TabStateCall | null = null;
    const deps = makeDeps({
      setTabState: (state: TabStateCall) => { capturedState = state; },
      readTabState: () => null,
    });
    QuestionAnswered.execute(makeInput(), deps);
    expect(capturedState!.title).toContain("Processing answer");
  });

  it("uses fallback when previousTitle is empty", () => {
    let capturedState: TabStateCall | null = null;
    const deps = makeDeps({
      setTabState: (state: TabStateCall) => { capturedState = state; },
      readTabState: () => ({ title: "teal", previousTitle: "", state: "question" }),
      stripPrefix: () => "",
    });
    QuestionAnswered.execute(makeInput(), deps);
    expect(capturedState!.title).toContain("Processing answer");
  });

  it("uses fallback when stripPrefix returns empty string", () => {
    let capturedState: TabStateCall | null = null;
    const deps = makeDeps({
      setTabState: (state: TabStateCall) => { capturedState = state; },
      readTabState: () => ({ title: "teal", previousTitle: "Some Title", state: "question" }),
      stripPrefix: () => "",
    });
    QuestionAnswered.execute(makeInput(), deps);
    expect(capturedState!.title).toContain("Processing answer");
  });

  it("passes session_id to setTabState", () => {
    let capturedState: TabStateCall | null = null;
    const deps = makeDeps({
      setTabState: (state: TabStateCall) => { capturedState = state; },
    });
    QuestionAnswered.execute(makeInput(), deps);
    expect(capturedState!.sessionId).toBe("test");
  });

  it("logs reset message to stderr", () => {
    const stderrMessages: string[] = [];
    const deps = makeDeps({
      stderr: (msg: string) => { stderrMessages.push(msg); },
    });
    QuestionAnswered.execute(makeInput(), deps);
    expect(stderrMessages.some(m => m.includes("Tab reset"))).toBe(true);
  });

  it("uses readTabState with session_id", () => {
    let readSessionId = "";
    const deps = makeDeps({
      readTabState: (id: string) => { readSessionId = id; return null; },
    });
    QuestionAnswered.execute(makeInput(), deps);
    expect(readSessionId).toBe("test");
  });
});

describe("QuestionAnswered defaultDeps", () => {
  it("defaultDeps.setTabState is a function", () => {
    expect(typeof QuestionAnswered.defaultDeps.setTabState).toBe("function");
  });

  it("defaultDeps.readTabState is a function", () => {
    expect(typeof QuestionAnswered.defaultDeps.readTabState).toBe("function");
  });

  it("defaultDeps.stripPrefix is a function", () => {
    expect(typeof QuestionAnswered.defaultDeps.stripPrefix).toBe("function");
  });

  it("defaultDeps.stderr writes without throwing", () => {
    expect(() => QuestionAnswered.defaultDeps.stderr("test")).not.toThrow();
  });
});
