/**
 * Signal Logger — Standardised JSONL logging for hook outputs.
 *
 * Every hook that logs decisions writes to MEMORY/LEARNING/SIGNALS/.
 * This utility standardises the base fields and handles the ensureDir +
 * appendFile boilerplate so hooks don't duplicate the pattern.
 *
 * Usage:
 *   import { logSignal, type SignalLoggerDeps } from "../lib/signal-logger";
 *
 *   logSignal(deps, "type-strictness.jsonl", {
 *     session_id: input.session_id,
 *     hook: "TypeStrictness",
 *     event: "PreToolUse",
 *     tool: input.tool_name,
 *     file: filePath,
 *     outcome: "block",
 *     violations: [...],
 *   });
 */

import { join } from "node:path";
import { appendFile, ensureDir } from "@hooks/core/adapters/fs";
import type { ResultError } from "@hooks/core/error";
import type { Result } from "@hooks/core/result";
import type { HookEventType } from "@hooks/core/types/hook-inputs";

// ─── Types ───────────────────────────────────────────────────────────────────

/** JSON-serialisable value — covers all extra fields callers pass to logSignal. */
type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export interface SignalEntry {
  session_id: string;
  hook: string;
  event: HookEventType;
  tool: string;
  file: string;
  outcome: string;
  [key: string]: JsonValue;
}

export interface SignalLoggerDeps {
  appendFile: (path: string, content: string) => Result<void, ResultError>;
  ensureDir: (path: string) => Result<void, ResultError>;
  baseDir: string;
}

// ─── Default Deps ────────────────────────────────────────────────────────────

const defaultDeps: SignalLoggerDeps = {
  appendFile,
  ensureDir,
  baseDir: process.env.PAI_DIR || join(process.env.HOME!, ".claude"),
};

export const defaultSignalLoggerDeps: SignalLoggerDeps = defaultDeps;

// ─── Logger ──────────────────────────────────────────────────────────────────

/**
 * Log a signal entry to a JSONL file in MEMORY/LEARNING/SIGNALS/.
 *
 * Automatically prepends a timestamp. The `logFile` parameter is the
 * filename only (e.g. "type-strictness.jsonl"), not a full path.
 */
export function logSignal(deps: SignalLoggerDeps, logFile: string, entry: SignalEntry): void {
  const signalsDir = join(deps.baseDir, "MEMORY/LEARNING/SIGNALS");
  deps.ensureDir(signalsDir);

  const fullEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  deps.appendFile(join(signalsDir, logFile), `${JSON.stringify(fullEntry)}\n`);
}
