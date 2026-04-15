import { describe, expect, it } from "bun:test";
import {
  QuestionAnswered,
  type QuestionAnsweredDeps,
} from "@hooks/hooks/QuestionAnswered/QuestionAnswered/QuestionAnswered.contract";

const stubInput = {
  session_id: "test-session",
  tool_name: "AskUserQuestion",
  tool_input: {},
} as const;

function makeDeps(overrides: Partial<QuestionAnsweredDeps> = {}): QuestionAnsweredDeps {
  return {
    stderr: () => {},
    ...overrides,
  };
}

describe("QuestionAnswered", () => {
  it("has correct name and event", () => {
    expect(QuestionAnswered.name).toBe("QuestionAnswered");
    expect(QuestionAnswered.event).toBe("PostToolUse");
  });

  it("accepts any input", () => {
    expect(QuestionAnswered.accepts(stubInput)).toBe(true);
  });

  // INTENTIONAL NO-OP: QuestionAnswered tab-switching behavior was removed.
  // The hook now returns ok({}) for every input — no side effects, no stderr output.
  // These assertions lock down that contract so any future behavior addition is caught.
  it("returns ok with empty value for AskUserQuestion input", () => {
    const stderrCalls: string[] = [];
    const deps = makeDeps({ stderr: (msg) => stderrCalls.push(msg) });

    const result = QuestionAnswered.execute(stubInput, deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Value must be exactly {} — no hook-output fields added
      expect(result.value).toEqual({});
      expect(Object.keys(result.value)).toHaveLength(0);
    }
    // Silent no-op: stderr must not be called
    expect(stderrCalls).toHaveLength(0);
  });

  it("is a universal no-op regardless of tool_name", () => {
    // accepts() returns true for all inputs; filtering is in settings.json.
    // Verify the no-op behavior holds for inputs beyond AskUserQuestion.
    const otherInput = {
      session_id: "test-session",
      tool_name: "Bash",
      tool_input: { command: "echo hi" },
    };
    const stderrCalls: string[] = [];
    const deps = makeDeps({ stderr: (msg) => stderrCalls.push(msg) });

    expect(QuestionAnswered.accepts(otherInput)).toBe(true);

    const result = QuestionAnswered.execute(otherInput, deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({});
      expect(Object.keys(result.value)).toHaveLength(0);
    }
    expect(stderrCalls).toHaveLength(0);
  });

  it("does not mutate input", () => {
    const input = {
      session_id: "test-session",
      tool_name: "AskUserQuestion",
      tool_input: { question: "Are you sure?" },
    };
    const frozen = Object.freeze({ ...input });

    // If execute tried to modify input, this would throw in strict mode
    const result = QuestionAnswered.execute(frozen, makeDeps());

    expect(result.ok).toBe(true);
  });
});
