/**
 * Shared tool input extraction utilities and type guards.
 *
 * Type guards narrow a ToolHookInput to a specific per-tool shape, giving
 * compile-time access to typed fields without `as` casts. Extraction helpers
 * remain for callers that don't need full narrowing.
 */

import type {
  AgentToolInput,
  BashToolInput,
  EditToolInput,
  GlobToolInput,
  GrepToolInput,
  MultiEditToolInput,
  ReadToolInput,
  SkillToolInput,
  TaskCreateToolInput,
  TaskUpdateToolInput,
  ToolHookInput,
  WriteToolInput,
} from "@hooks/core/types/hook-inputs";

// ─── Type Guards ──────────────────────────────────────────────────────────────

/** Narrows to a Write tool input with typed file_path and content fields. */
export function isWriteInput(
  input: ToolHookInput,
): input is ToolHookInput & { tool_input: WriteToolInput } {
  return input.tool_name === "Write";
}

/** Narrows to an Edit tool input with typed file_path, old_string, and new_string fields. */
export function isEditInput(
  input: ToolHookInput,
): input is ToolHookInput & { tool_input: EditToolInput } {
  return input.tool_name === "Edit";
}

/** Narrows to a MultiEdit tool input with typed file_path and edits fields. */
export function isMultiEditInput(
  input: ToolHookInput,
): input is ToolHookInput & { tool_input: MultiEditToolInput } {
  return input.tool_name === "MultiEdit";
}

/** Narrows to a Bash tool input with typed command field. */
export function isBashInput(
  input: ToolHookInput,
): input is ToolHookInput & { tool_input: BashToolInput } {
  return input.tool_name === "Bash";
}

/** Narrows to a Read tool input with typed file_path field. */
export function isReadInput(
  input: ToolHookInput,
): input is ToolHookInput & { tool_input: ReadToolInput } {
  return input.tool_name === "Read";
}

/** Narrows to a Glob tool input with typed pattern field. */
export function isGlobInput(
  input: ToolHookInput,
): input is ToolHookInput & { tool_input: GlobToolInput } {
  return input.tool_name === "Glob";
}

/** Narrows to a Grep tool input with typed pattern field. */
export function isGrepInput(
  input: ToolHookInput,
): input is ToolHookInput & { tool_input: GrepToolInput } {
  return input.tool_name === "Grep";
}

/** Narrows to a Skill tool input with typed skill field. */
export function isSkillInput(
  input: ToolHookInput,
): input is ToolHookInput & { tool_input: SkillToolInput } {
  return input.tool_name === "Skill";
}

/** Narrows to an Agent tool input with typed agent fields. */
export function isAgentInput(
  input: ToolHookInput,
): input is ToolHookInput & { tool_input: AgentToolInput } {
  return input.tool_name === "Agent";
}

/** Narrows to a TaskUpdate tool input with typed taskId and status fields. */
export function isTaskUpdateInput(
  input: ToolHookInput,
): input is ToolHookInput & { tool_input: TaskUpdateToolInput } {
  return input.tool_name === "TaskUpdate";
}

/** Narrows to a TaskCreate tool input with typed subject/description/prompt fields. */
export function isTaskCreateInput(
  input: ToolHookInput,
): input is ToolHookInput & { tool_input: TaskCreateToolInput } {
  return input.tool_name === "TaskCreate";
}

// ─── Extraction Helpers ───────────────────────────────────────────────────────

/** Extract file_path from tool_input. */
export function getFilePath(input: ToolHookInput): string | null {
  if (typeof input.tool_input !== "object" || input.tool_input === null) return null;
  const fp = (input.tool_input as Record<string, unknown>).file_path;
  return typeof fp === "string" ? fp : null;
}

/** Extract command from Bash tool_input. */
export function getCommand(input: ToolHookInput): string {
  if (typeof input.tool_input === "string") return input.tool_input as string;
  if (typeof input.tool_input !== "object" || input.tool_input === null) return "";
  if (isBashInput(input)) return input.tool_input.command;
  const cmd = (input.tool_input as Record<string, unknown>).command;
  return typeof cmd === "string" ? cmd : "";
}

/** Extract content from Write tool_input. */
export function getWriteContent(input: ToolHookInput): string | null {
  if (typeof input.tool_input !== "object" || input.tool_input === null) return null;
  if (isWriteInput(input)) return input.tool_input.content ?? null;
  const content = (input.tool_input as Record<string, unknown>).content;
  return typeof content === "string" ? content : null;
}
