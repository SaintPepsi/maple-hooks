/**
 * DuplicationIndexBuilder Contract — PostToolUse notification on Write/Edit to .ts files.
 *
 * Builds the duplication index (.duplication-index.json) on the first .ts file
 * write in a session. Subsequent writes skip if the index is fresh (<30 min).
 * No additionalContext — this is a silent background operation.
 *
 * Design: docs/plans/2026-03-27-duplication-index-builder-hook-design.md
 */

import type { SyncHookContract } from "@hooks/core/contract";
import type { ToolHookInput } from "@hooks/core/types/hook-inputs";
import type { ContinueOutput } from "@hooks/core/types/hook-outputs";
import { ok, type Result } from "@hooks/core/result";
import type { PaiError } from "@hooks/core/error";
import {
  readFile as adapterReadFile,
  writeFile as adapterWriteFile,
  fileExists,
  stat as adapterStat,
  readDir as adapterReadDir,
  ensureDir,
} from "@hooks/core/adapters/fs";
import { buildIndex } from "@hooks/hooks/DuplicationDetection/index-builder-logic";
import { defaultParserDeps } from "@hooks/hooks/DuplicationDetection/parser";
import type { IndexBuilderDeps } from "@hooks/hooks/DuplicationDetection/index-builder-logic";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DuplicationIndexBuilderDeps {
  indexBuilderDeps: IndexBuilderDeps;
  writeFile: (path: string, content: string) => boolean;
  exists: (path: string) => boolean;
  stat: (path: string) => { mtimeMs: number } | null;
  stderr: (msg: string) => void;
  now: () => number;
  findProjectRoot: (filePath: string) => string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const INDEX_FILENAME = ".duplication-index.json";
const FRESHNESS_MS = 30 * 60 * 1000; // 30 minutes

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFilePath(input: ToolHookInput): string | null {
  if (typeof input.tool_input !== "object" || input.tool_input === null) return null;
  return (input.tool_input as Record<string, unknown>).file_path as string ?? null;
}

function defaultFindProjectRoot(filePath: string): string | null {
  const { dirname, join } = require("path");
  let dir = dirname(filePath) as string;
  for (let i = 0; i < 10; i++) {
    const pkg = join(dir, "package.json") as string;
    const git = join(dir, ".git") as string;
    if (fileExists(pkg) || fileExists(git)) return dir;
    const parent = dirname(dir) as string;
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function isIndexFresh(indexPath: string, deps: DuplicationIndexBuilderDeps): boolean {
  if (!deps.exists(indexPath)) return false;
  const s = deps.stat(indexPath);
  if (!s) return false;
  return (deps.now() - s.mtimeMs) < FRESHNESS_MS;
}

// ─── Default Deps ───────────────────────────────────────────────────────────

const defaultDeps: DuplicationIndexBuilderDeps = {
  indexBuilderDeps: {
    readDir: (path: string): string[] | null => {
      const result = adapterReadDir(path);
      return result.ok ? result.value : null;
    },
    readFile: (path: string): string | null => {
      const result = adapterReadFile(path);
      return result.ok ? result.value : null;
    },
    isDirectory: (path: string): boolean => {
      const result = adapterStat(path);
      return result.ok ? result.value.isDirectory() : false;
    },
    exists: (path: string): boolean => fileExists(path),
    stat: (path: string): { mtimeMs: number } | null => {
      const result = adapterStat(path);
      return result.ok ? { mtimeMs: result.value.mtimeMs } : null;
    },
    join: (...parts: string[]): string => require("path").join(...parts) as string,
    resolve: (path: string): string => require("path").resolve(path) as string,
    parserDeps: defaultParserDeps,
  },
  writeFile: (path: string, content: string): boolean => {
    const result = adapterWriteFile(path, content);
    return result.ok;
  },
  exists: (path: string): boolean => fileExists(path),
  stat: (path: string): { mtimeMs: number } | null => {
    const result = adapterStat(path);
    return result.ok ? { mtimeMs: result.value.mtimeMs } : null;
  },
  stderr: (msg) => process.stderr.write(msg + "\n"),
  now: () => Date.now(),
  findProjectRoot: defaultFindProjectRoot,
};

// ─── Contract ───────────────────────────────────────────────────────────────

export const DuplicationIndexBuilderContract: SyncHookContract<
  ToolHookInput,
  ContinueOutput,
  DuplicationIndexBuilderDeps
> = {
  name: "DuplicationIndexBuilder",
  event: "PostToolUse",

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
    deps: DuplicationIndexBuilderDeps,
  ): Result<ContinueOutput, PaiError> {
    const filePath = getFilePath(input)!;

    // Find project root
    const projectRoot = deps.findProjectRoot(filePath);
    if (!projectRoot) {
      deps.stderr("[DuplicationIndexBuilder] No project root found — skipping");
      return ok({ type: "continue", continue: true });
    }

    const indexPath = deps.indexBuilderDeps.join(projectRoot, INDEX_FILENAME);

    // Skip if index is fresh
    if (isIndexFresh(indexPath, deps)) {
      deps.stderr("[DuplicationIndexBuilder] Index is fresh — skipping rebuild");
      return ok({ type: "continue", continue: true });
    }

    // Build the index
    const start = performance.now();
    const index = buildIndex(projectRoot, deps.indexBuilderDeps);
    const buildMs = performance.now() - start;

    if (index.functionCount === 0) {
      deps.stderr("[DuplicationIndexBuilder] No functions found — skipping");
      return ok({ type: "continue", continue: true });
    }

    // Write the index
    const json = JSON.stringify(index);
    const written = deps.writeFile(indexPath, json);

    if (written) {
      const sizeKB = (json.length / 1024).toFixed(1);
      deps.stderr(
        `[DuplicationIndexBuilder] Built index: ${index.functionCount} functions from ${index.fileCount} files (${sizeKB}KB) in ${buildMs.toFixed(0)}ms`,
      );
    } else {
      deps.stderr("[DuplicationIndexBuilder] Failed to write index — continuing without");
    }

    return ok({ type: "continue", continue: true });
  },

  defaultDeps,
};
