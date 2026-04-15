/**
 * Typed hook inputs for all eight Claude Code hook event types.
 */

// ─── Event Types ─────────────────────────────────────────────────────────────

export type HookEventType =
  | "PreToolUse"
  | "PostToolUse"
  | "SessionStart"
  | "SessionEnd"
  | "UserPromptSubmit"
  | "PreCompact"
  | "Stop"
  | "SubagentStart"
  | "SubagentStop"
  | "PermissionRequest";

// ─── Base Input ──────────────────────────────────────────────────────────────

export interface HookInputBase {
  session_id: string;
  hook_type?: string;
}

// ─── Per-Tool Input Shapes ────────────────────────────────────────────────────
//
// Index signatures (`[key: string]: unknown`) keep each interface assignable
// to/from `Record<string, unknown>` so existing consumers that access
// tool_input fields without narrowing continue to compile. After narrowing via
// a type guard (see lib/tool-input.ts), each named field is properly typed.

export interface WriteToolInput {
  file_path: string;
  content: string;
  [key: string]: unknown;
}

export interface EditToolInput {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
  [key: string]: unknown;
}

export interface MultiEditToolInput {
  file_path: string;
  edits: Array<{ old_string: string; new_string: string; replace_all?: boolean }>;
  [key: string]: unknown;
}

export interface BashToolInput {
  command: string;
  restart?: boolean;
  [key: string]: unknown;
}

export interface ReadToolInput {
  file_path: string;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

export interface GlobToolInput {
  pattern: string;
  path?: string;
  [key: string]: unknown;
}

export interface GrepToolInput {
  pattern: string;
  path?: string;
  glob?: string;
  type?: string;
  output_mode?: string;
  head_limit?: number;
  [key: string]: unknown;
}

export interface SkillToolInput {
  skill: string;
  args?: string;
  [key: string]: unknown;
}

export interface AgentToolInput {
  name?: string;
  description?: string;
  prompt?: string;
  subagent_type?: string;
  run_in_background?: boolean;
  task_description?: string;
  [key: string]: unknown;
}

export interface TaskUpdateToolInput {
  taskId: string;
  status: string;
  [key: string]: unknown;
}

export interface TaskCreateToolInput {
  subject?: string;
  description?: string;
  prompt?: string;
  [key: string]: unknown;
}

/** Fallback for tools not explicitly modelled above. */
export type GenericToolInput = Record<string, unknown>;

/**
 * Union of all known tool_input shapes plus a generic fallback.
 * Use type guards from `lib/tool-input.ts` to narrow to a specific member.
 */
export type ToolInput =
  | WriteToolInput
  | EditToolInput
  | MultiEditToolInput
  | BashToolInput
  | ReadToolInput
  | GlobToolInput
  | GrepToolInput
  | SkillToolInput
  | AgentToolInput
  | TaskUpdateToolInput
  | TaskCreateToolInput
  | GenericToolInput;

// ─── Tool Inputs (Pre/PostToolUse) ───────────────────────────────────────────

export interface ToolHookInput extends HookInputBase {
  tool_name: string;
  tool_input: ToolInput;
  tool_response?: unknown;
  /** Raw field name used by Claude Code at runtime (complement to tool_response). */
  tool_output?: unknown;
}

// ─── Session Inputs ──────────────────────────────────────────────────────────

export interface SessionStartInput extends HookInputBase {
  // SessionStart receives minimal data
}

export interface SessionEndInput extends HookInputBase {
  transcript_path?: string;
}

// ─── Prompt Submit Input ─────────────────────────────────────────────────────

export interface UserPromptSubmitInput extends HookInputBase {
  prompt?: string;
  user_prompt?: string; // Legacy field name
  transcript_path?: string;
}

// ─── PreCompact Input ────────────────────────────────────────────────────────

export interface PreCompactInput extends HookInputBase {
  // PreCompact fires before context compaction with no tool context
  trigger?: string;
}

// ─── Stop Input ──────────────────────────────────────────────────────────────

export interface StopInput extends HookInputBase {
  transcript_path?: string;
  last_assistant_message?: string;
  stop_hook_active?: boolean;
}

// ─── Subagent Lifecycle Inputs ────────────────────────────────────────────────

export interface SubagentStartInput extends HookInputBase {
  transcript_path?: string;
}

export interface SubagentStopInput extends HookInputBase {
  transcript_path?: string;
}

// ─── PermissionRequest Input ─────────────────────────────────────────────────

export interface PermissionRequestInput extends HookInputBase {
  tool_name: string;
  tool_input: Record<string, unknown>;
  permission_mode?: string;
  permission_suggestions?: Array<{
    type: string;
    rules: Array<{ toolName: string; ruleContent: string }>;
    behavior: string;
    destination: string;
  }>;
}

// ─── Union Type ──────────────────────────────────────────────────────────────

export type HookInput =
  | ToolHookInput
  | SessionStartInput
  | SessionEndInput
  | UserPromptSubmitInput
  | PreCompactInput
  | StopInput
  | SubagentStartInput
  | SubagentStopInput
  | PermissionRequestInput;
