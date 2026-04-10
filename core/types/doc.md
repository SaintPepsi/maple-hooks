## Overview

Typed input and output interfaces for all Claude Code hook events. Provides type safety between the JSON stdin that Claude Code sends and the contracts that consume it.

## Files

- **hook-inputs.ts** — Input types for each hook event (PreToolUse, PostToolUse, SessionStart, SessionEnd, UserPromptSubmit, PreCompact, Stop, SubagentStart, SubagentStop, PermissionRequest)
- **hook-outputs.ts** — Output types (ContinueOutput, BlockOutput, AskOutput, ContextOutput, UpdatedInputOutput, SilentOutput) with factory functions

## Key Types

- `ToolHookInput` — Used by PreToolUse and PostToolUse hooks. Contains `tool_name`, `tool_input`, optional `tool_response`.
- `StopInput` — Used by Stop hooks. Contains optional `transcript_path`, `last_assistant_message` (text of Claude's final response), and `stop_hook_active`.
- `PermissionRequestInput` — Used by PermissionRequest hooks. Contains `tool_name`, `tool_input`, optional `permission_mode` and `permission_suggestions`.
- `HookInput` — Union of all input types. Used by the runner for generic dispatch.
- `HookOutput` — Union of all output types. Used by the runner for formatting.
