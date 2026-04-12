/**
 * Smoke tests for hook-output-schema.
 *
 * Verifies that (1) `validateHookOutput` accepts canonical SyncHookJSONOutput
 * shapes for the main recipe cases (continue, PreToolUse permissionDecision,
 * PostToolUse additionalContext), and (2) `HOOK_SPECIFIC_EVENTS` contains all
 * 15 events the SDK discriminated union covers. These are structural sanity
 * checks — the schema is exercised in full by `core/runner.test.ts` and
 * `core/runner.coverage.test.ts` through the runner's `validateHookOutput`
 * call.
 */

import { describe, expect, it } from "bun:test";
import { HOOK_SPECIFIC_EVENTS, validateHookOutput } from "./hook-output-schema";

describe("hook-output-schema", () => {
  it("validates a bare continue output (R1)", () => {
    const result = validateHookOutput({ continue: true });
    expect(result._tag).toBe("Right");
  });

  it("validates a PreToolUse permissionDecision deny output (R4)", () => {
    const result = validateHookOutput({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "unsafe path",
      },
    });
    expect(result._tag).toBe("Right");
  });

  it("validates a PostToolUse additionalContext output (R2)", () => {
    const result = validateHookOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: "context injection text",
      },
    });
    expect(result._tag).toBe("Right");
  });

  it("validates a non-PreToolUse top-level decision block output (R5)", () => {
    const result = validateHookOutput({
      decision: "block",
      reason: "PostToolUse block reason",
    });
    expect(result._tag).toBe("Right");
  });

  it("validates an empty output (R8 silent)", () => {
    const result = validateHookOutput({});
    expect(result._tag).toBe("Right");
  });

  it("validates defer as a valid permissionDecision (PreToolUse)", () => {
    const result = validateHookOutput({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "defer",
      },
    });
    expect(result._tag).toBe("Right");
  });

  it("validates PermissionDenied hookSpecificOutput round-trip", () => {
    const result = validateHookOutput({
      hookSpecificOutput: {
        hookEventName: "PermissionDenied",
        retry: true,
      },
    });
    expect(result._tag).toBe("Right");
  });

  it("validates Elicitation hookSpecificOutput round-trip", () => {
    const result = validateHookOutput({
      hookSpecificOutput: {
        hookEventName: "Elicitation",
        action: "accept",
        content: { confirmed: true },
      },
    });
    expect(result._tag).toBe("Right");
  });

  it("validates ElicitationResult hookSpecificOutput round-trip", () => {
    const result = validateHookOutput({
      hookSpecificOutput: {
        hookEventName: "ElicitationResult",
        action: "decline",
      },
    });
    expect(result._tag).toBe("Right");
  });

  it("validates CwdChanged hookSpecificOutput round-trip", () => {
    const result = validateHookOutput({
      hookSpecificOutput: {
        hookEventName: "CwdChanged",
        watchPaths: ["/tmp/project"],
      },
    });
    expect(result._tag).toBe("Right");
  });

  it("validates FileChanged hookSpecificOutput round-trip", () => {
    const result = validateHookOutput({
      hookSpecificOutput: {
        hookEventName: "FileChanged",
        watchPaths: ["/tmp/project/src/main.ts"],
      },
    });
    expect(result._tag).toBe("Right");
  });

  it("validates WorktreeCreate hookSpecificOutput round-trip", () => {
    const result = validateHookOutput({
      hookSpecificOutput: {
        hookEventName: "WorktreeCreate",
        worktreePath: "/tmp/worktrees/feat-branch",
      },
    });
    expect(result._tag).toBe("Right");
  });

  it("HOOK_SPECIFIC_EVENTS contains all 15 SDK events", () => {
    expect(HOOK_SPECIFIC_EVENTS.size).toBe(15);
    expect(HOOK_SPECIFIC_EVENTS.has("PreToolUse")).toBe(true);
    expect(HOOK_SPECIFIC_EVENTS.has("PostToolUse")).toBe(true);
    expect(HOOK_SPECIFIC_EVENTS.has("PostToolUseFailure")).toBe(true);
    expect(HOOK_SPECIFIC_EVENTS.has("UserPromptSubmit")).toBe(true);
    expect(HOOK_SPECIFIC_EVENTS.has("SessionStart")).toBe(true);
    expect(HOOK_SPECIFIC_EVENTS.has("Setup")).toBe(true);
    expect(HOOK_SPECIFIC_EVENTS.has("SubagentStart")).toBe(true);
    expect(HOOK_SPECIFIC_EVENTS.has("Notification")).toBe(true);
    expect(HOOK_SPECIFIC_EVENTS.has("PermissionRequest")).toBe(true);
    expect(HOOK_SPECIFIC_EVENTS.has("PermissionDenied")).toBe(true);
    expect(HOOK_SPECIFIC_EVENTS.has("Elicitation")).toBe(true);
    expect(HOOK_SPECIFIC_EVENTS.has("ElicitationResult")).toBe(true);
    expect(HOOK_SPECIFIC_EVENTS.has("CwdChanged")).toBe(true);
    expect(HOOK_SPECIFIC_EVENTS.has("FileChanged")).toBe(true);
    expect(HOOK_SPECIFIC_EVENTS.has("WorktreeCreate")).toBe(true);
  });
});
