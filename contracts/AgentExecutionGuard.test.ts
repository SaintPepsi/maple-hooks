import { describe, it, expect } from "bun:test";
import { AgentExecutionGuard } from "@hooks/contracts/AgentExecutionGuard";
import type { ToolHookInput } from "@hooks/core/types/hook-inputs";
import type { ContinueOutput, ContextOutput } from "@hooks/core/types/hook-outputs";
import type { Result } from "@hooks/core/result";
import type { PaiError } from "@hooks/core/error";

function makeInput(overrides: Record<string, unknown> = {}): ToolHookInput {
  return {
    session_id: "test",
    tool_name: "Task",
    tool_input: { subagent_type: "general-purpose", description: "test task", ...overrides },
  };
}

describe("AgentExecutionGuard", () => {
  it("has correct name and event", () => {
    expect(AgentExecutionGuard.name).toBe("AgentExecutionGuard");
    expect(AgentExecutionGuard.event).toBe("PreToolUse");
  });

  it("accepts all inputs", () => {
    expect(AgentExecutionGuard.accepts(makeInput())).toBe(true);
  });

  it("passes when run_in_background is true", () => {
    const result = AgentExecutionGuard.execute(
      makeInput({ run_in_background: true }), {},
    ) as Result<ContinueOutput | ContextOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("continue");
    }
  });

  it("passes for Explore agent type", () => {
    const result = AgentExecutionGuard.execute(
      makeInput({ subagent_type: "Explore" }), {},
    ) as Result<ContinueOutput | ContextOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("continue");
    }
  });

  it("passes for haiku model", () => {
    const result = AgentExecutionGuard.execute(
      makeInput({ model: "haiku" }), {},
    ) as Result<ContinueOutput | ContextOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("continue");
    }
  });

  it("passes for FAST timing in prompt scope", () => {
    const result = AgentExecutionGuard.execute(
      makeInput({ prompt: "## Scope\nTiming: FAST\nDo something quick" }), {},
    ) as Result<ContinueOutput | ContextOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("continue");
    }
  });

  it("warns for foreground non-fast agent", () => {
    const result = AgentExecutionGuard.execute(
      makeInput(), {},
    ) as Result<ContinueOutput | ContextOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("context");
      if (result.value.type === "context") {
        expect(result.value.content).toContain("FOREGROUND AGENT DETECTED");
        expect(result.value.content).toContain("run_in_background");
      }
    }
  });

  it("warning includes agent description", () => {
    const result = AgentExecutionGuard.execute(
      makeInput({ description: "research task" }), {},
    ) as Result<ContinueOutput | ContextOutput, PaiError>;
    if (result.ok && result.value.type === "context") {
      expect(result.value.content).toContain("research task");
    }
  });

  it("uses subagent_type as fallback description when description missing", () => {
    const result = AgentExecutionGuard.execute(
      makeInput({ description: undefined, subagent_type: "Researcher" }), {},
    ) as Result<ContinueOutput | ContextOutput, PaiError>;
    if (result.ok && result.value.type === "context") {
      expect(result.value.content).toContain("Researcher");
    }
  });

  it("uses unknown when both description and subagent_type are missing", () => {
    const input: ToolHookInput = {
      session_id: "test",
      tool_name: "Task",
      tool_input: {},
    };
    const result = AgentExecutionGuard.execute(
      input, {},
    ) as Result<ContinueOutput | ContextOutput, PaiError>;
    if (result.ok && result.value.type === "context") {
      expect(result.value.content).toContain("unknown");
    }
  });

  it("handles empty tool_input", () => {
    const input: ToolHookInput = {
      session_id: "test",
      tool_name: "Task",
      tool_input: {},
    };
    const result = AgentExecutionGuard.execute(input, {});
    expect(result.ok).toBe(true);
  });

  it("handles non-matching model (not haiku)", () => {
    const result = AgentExecutionGuard.execute(
      makeInput({ model: "opus" }), {},
    ) as Result<ContinueOutput | ContextOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("context"); // should warn
    }
  });

  it("FAST timing is case-insensitive", () => {
    const result = AgentExecutionGuard.execute(
      makeInput({ prompt: "## scope\ntiming: fast\nquick task" }), {},
    ) as Result<ContinueOutput | ContextOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("continue");
    }
  });
});
