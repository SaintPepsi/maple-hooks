import { describe, it, expect } from "bun:test";
import { VoiceGate, type VoiceGateDeps } from "@hooks/contracts/VoiceGate";
import type { ToolHookInput } from "@hooks/core/types/hook-inputs";
import type { ContinueOutput, BlockOutput } from "@hooks/core/types/hook-outputs";
import type { Result } from "@hooks/core/result";
import type { PaiError } from "@hooks/core/error";

function makeDeps(overrides: Partial<VoiceGateDeps> = {}): VoiceGateDeps {
  return {
    existsSync: () => false,
    getTermProgram: () => "iTerm.app",
    getItermSessionId: () => undefined,
    getPaiDir: () => "/tmp/test-pai",
    ...overrides,
  };
}

function makeInput(command: string): ToolHookInput {
  return {
    session_id: "test-sess",
    tool_name: "Bash",
    tool_input: { command },
  };
}

describe("VoiceGate", () => {
  it("has correct name and event", () => {
    expect(VoiceGate.name).toBe("VoiceGate");
    expect(VoiceGate.event).toBe("PreToolUse");
  });

  it("rejects non-voice commands via accepts()", () => {
    expect(VoiceGate.accepts(makeInput("git status"))).toBe(false);
    expect(VoiceGate.accepts(makeInput("echo hello"))).toBe(false);
  });

  it("accepts voice curl commands", () => {
    expect(VoiceGate.accepts(makeInput("curl -s localhost:8888/notify"))).toBe(true);
  });

  it("allows voice curl from main session (iTerm detected)", () => {
    const deps = makeDeps({ getTermProgram: () => "iTerm.app" });
    const result = VoiceGate.execute(makeInput("curl localhost:8888"), deps) as Result<ContinueOutput | BlockOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("continue");
    }
  });

  it("allows voice curl from WarpTerminal", () => {
    const deps = makeDeps({ getTermProgram: () => "WarpTerminal" });
    const result = VoiceGate.execute(makeInput("curl localhost:8888"), deps) as Result<ContinueOutput | BlockOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("continue");
    }
  });

  it("allows voice curl from Alacritty", () => {
    const deps = makeDeps({ getTermProgram: () => "Alacritty" });
    const result = VoiceGate.execute(makeInput("curl localhost:8888"), deps) as Result<ContinueOutput | BlockOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("continue");
    }
  });

  it("allows voice curl from Apple_Terminal", () => {
    const deps = makeDeps({ getTermProgram: () => "Apple_Terminal" });
    const result = VoiceGate.execute(makeInput("curl localhost:8888"), deps) as Result<ContinueOutput | BlockOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("continue");
    }
  });

  it("blocks voice curl from subagent (no terminal, kitty dir exists but session missing)", () => {
    const deps = makeDeps({
      getTermProgram: () => undefined,
      getItermSessionId: () => undefined,
      existsSync: (path: string) => path.endsWith("kitty-sessions"),
    });
    const result = VoiceGate.execute(makeInput("curl localhost:8888"), deps) as Result<ContinueOutput | BlockOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("block");
      if (result.value.type === "block") {
        expect(result.value.reason.toLowerCase()).toContain("subagent");
      }
    }
  });

  it("allows when iTerm session ID present", () => {
    const deps = makeDeps({
      getTermProgram: () => undefined,
      getItermSessionId: () => "some-session",
    });
    const result = VoiceGate.execute(makeInput("curl localhost:8888"), deps) as Result<ContinueOutput | BlockOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("continue");
    }
  });

  it("allows when no kitty sessions dir exists (defaults to allowing)", () => {
    const deps = makeDeps({
      getTermProgram: () => undefined,
      getItermSessionId: () => undefined,
      existsSync: () => false,
    });
    const result = VoiceGate.execute(makeInput("curl localhost:8888"), deps) as Result<ContinueOutput | BlockOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("continue");
    }
  });

  it("allows when kitty session file exists for this session", () => {
    const deps = makeDeps({
      getTermProgram: () => undefined,
      getItermSessionId: () => undefined,
      existsSync: () => true, // both kitty dir and session file exist
    });
    const result = VoiceGate.execute(makeInput("curl localhost:8888"), deps) as Result<ContinueOutput | BlockOutput, PaiError>;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("continue");
    }
  });

  it("accepts input with empty command", () => {
    const input: ToolHookInput = {
      session_id: "test",
      tool_name: "Bash",
      tool_input: {},
    };
    expect(VoiceGate.accepts(input)).toBe(false);
  });
});

describe("VoiceGate defaultDeps", () => {
  it("defaultDeps.existsSync returns a boolean", () => {
    expect(typeof VoiceGate.defaultDeps.existsSync("/tmp")).toBe("boolean");
  });

  it("defaultDeps.getTermProgram returns string or undefined", () => {
    const result = VoiceGate.defaultDeps.getTermProgram();
    expect(result === undefined || typeof result === "string").toBe(true);
  });

  it("defaultDeps.getItermSessionId returns string or undefined", () => {
    const result = VoiceGate.defaultDeps.getItermSessionId();
    expect(result === undefined || typeof result === "string").toBe(true);
  });

  it("defaultDeps.getPaiDir returns a string", () => {
    expect(typeof VoiceGate.defaultDeps.getPaiDir()).toBe("string");
  });
});
