/**
 * Type aliases derived from @anthropic-ai/claude-agent-sdk.
 *
 * These provide compile-time safety without runtime overhead.
 * No functions — just types extracted from the SDK union.
 */

import type { SyncHookJSONOutput } from "@anthropic-ai/claude-agent-sdk";

/** Event names that support hookSpecificOutput — derived from the SDK discriminated union. */
export type HookSpecificEventName = NonNullable<
  SyncHookJSONOutput["hookSpecificOutput"]
>["hookEventName"];

/**
 * Events that CANNOT use hookSpecificOutput.
 * These events can only use top-level fields: continue, systemMessage, decision, reason, etc.
 */
export type NonHookSpecificEvent =
  | "PreCompact"
  | "PostCompact"
  | "SessionEnd"
  | "Stop"
  | "StopFailure"
  | "SubagentStop"
  | "TeammateIdle"
  | "TaskCreated"
  | "TaskCompleted"
  | "ConfigChange"
  | "WorktreeRemove"
  | "InstructionsLoaded";
