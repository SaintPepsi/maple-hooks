/**
 * DuplicationChecker Contract — PreToolUse advisory for Write/Edit on .ts files.
 *
 * Thin contract shell. Logic lives in:
 *   - shared.ts: index loading, checking, formatting
 *   - parser.ts: SWC function extraction
 *
 * Design: docs/plans/2026-03-27-duplication-checker-hook-design.md
 */

import type { SyncHookContract } from "@hooks/core/contract";
import type { ToolHookInput } from "@hooks/core/types/hook-inputs";
import type { ContinueOutput } from "@hooks/core/types/hook-outputs";
import { ok, type Result } from "@hooks/core/result";
import type { PaiError } from "@hooks/core/error";
import { readFile as adapterReadFile, fileExists, appendFile as adapterAppendFile, ensureDir as adapterEnsureDir } from "@hooks/core/adapters/fs";
import {
  loadIndex,
  findIndexPath,
  checkFunctions,
  formatFindings,
  STALENESS_SECONDS,
} from "@hooks/hooks/DuplicationDetection/shared";
import { extractFunctions } from "@hooks/hooks/DuplicationDetection/parser";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DuplicationCheckerDeps {
  readFile: (path: string) => string | null;
  exists: (path: string) => boolean;
  appendFile: (path: string, content: string) => void;
  ensureDir: (path: string) => void;
  stderr: (msg: string) => void;
  now: () => number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFilePath(input: ToolHookInput): string | null {
  if (typeof input.tool_input !== "object" || input.tool_input === null) return null;
  return (input.tool_input as Record<string, unknown>).file_path as string ?? null;
}

function getWriteContent(input: ToolHookInput): string | null {
  if (typeof input.tool_input !== "object" || input.tool_input === null) return null;
  return (input.tool_input as Record<string, unknown>).content as string ?? null;
}

function simulateEdit(currentContent: string, input: ToolHookInput): string {
  const toolInput = input.tool_input as Record<string, unknown>;
  const oldStr = toolInput.old_string as string | undefined;
  const newStr = toolInput.new_string as string | undefined;
  if (oldStr && newStr !== undefined) return currentContent.replace(oldStr, newStr);
  return currentContent;
}

// ─── Contract ───────────────────────────────────────────────────────────────

const defaultDeps: DuplicationCheckerDeps = {
  readFile: (path: string): string | null => {
    const result = adapterReadFile(path);
    return result.ok ? result.value : null;
  },
  exists: (path: string): boolean => fileExists(path),
  appendFile: (path: string, content: string): void => {
    adapterAppendFile(path, content);
  },
  ensureDir: (path: string): void => {
    adapterEnsureDir(path);
  },
  stderr: (msg) => process.stderr.write(msg + "\n"),
  now: () => Date.now(),
};

export const DuplicationCheckerContract: SyncHookContract<
  ToolHookInput,
  ContinueOutput,
  DuplicationCheckerDeps
> = {
  name: "DuplicationChecker",
  event: "PreToolUse",

  accepts(input: ToolHookInput): boolean {
    if (input.tool_name !== "Write" && input.tool_name !== "Edit") return false;
    const filePath = getFilePath(input);
    if (!filePath) return false;
    if (!filePath.endsWith(".ts")) return false;
    if (filePath.endsWith(".d.ts")) return false;
    return true;
  },

  execute(
    input: ToolHookInput,
    deps: DuplicationCheckerDeps,
  ): Result<ContinueOutput, PaiError> {
    const filePath = getFilePath(input)!;

    const indexPath = findIndexPath(filePath, deps);
    if (!indexPath) {
      deps.stderr("[DuplicationChecker] No index found — skipping");
      return ok({ type: "continue", continue: true });
    }

    const index = loadIndex(indexPath, deps);
    if (!index) {
      deps.stderr("[DuplicationChecker] Failed to load index — skipping");
      return ok({ type: "continue", continue: true });
    }

    const indexAge = (deps.now() - new Date(index.builtAt).getTime()) / 1000;
    const isStale = indexAge > STALENESS_SECONDS;

    // Get content: Write has it directly, Edit needs simulation
    let content: string | null = null;
    if (input.tool_name === "Write") {
      content = getWriteContent(input);
    } else {
      const currentContent = deps.readFile(filePath);
      if (currentContent) content = simulateEdit(currentContent, input);
    }

    if (!content) return ok({ type: "continue", continue: true });

    const functions = extractFunctions(content, filePath.endsWith(".tsx"));
    if (functions.length === 0) return ok({ type: "continue", continue: true });

    const relPath = filePath.startsWith(index.root)
      ? filePath.slice(index.root.length + 1)
      : filePath;

    const matches = checkFunctions(functions, index, relPath);

    // Log all checks (findings or clean) to .claude/.duplication-checker.log
    const logDir = indexPath.replace(/\/\.duplication-index\.json$/, "");
    deps.ensureDir(logDir);
    const logPath = logDir + "/.duplication-checker.log";
    const logEntry = {
      ts: new Date(deps.now()).toISOString(),
      file: relPath,
      functions: functions.length,
      matches: matches.map((m) => ({
        fn: m.functionName,
        target: `${m.targetFile}:${m.targetName}`,
        signals: m.signals,
        score: Math.round(m.topScore * 100),
      })),
    };
    deps.appendFile(logPath, JSON.stringify(logEntry) + "\n");

    if (matches.length === 0) {
      deps.stderr(`[DuplicationChecker] ${filePath}: clean`);
      return ok({ type: "continue", continue: true });
    }

    const advisory = formatFindings(matches, isStale);
    deps.stderr(`[DuplicationChecker] ${filePath}: ${matches.length} finding(s)`);

    return ok({
      type: "continue",
      continue: true,
      additionalContext: advisory,
    });
  },

  defaultDeps,
};
