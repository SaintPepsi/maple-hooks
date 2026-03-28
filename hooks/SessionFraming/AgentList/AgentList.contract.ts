/**
 * AgentList Contract — Inject a persistent agent checklist at session start.
 *
 * Reads a user-maintained list file (PAI/AGENT-LIST.md) and injects it
 * into the agent's context as a ContextOutput. Supports both a static
 * session-start injection and a deferred mode that fires after N prompts.
 *
 * Skips for subagents.
 */

import type { SyncHookContract } from "@hooks/core/contract";
import type { SessionStartInput } from "@hooks/core/types/hook-inputs";
import type { ContextOutput, SilentOutput } from "@hooks/core/types/hook-outputs";
import { ok, type Result } from "@hooks/core/result";
import type { PaiError } from "@hooks/core/error";
import { fileExists, readFile, readJson } from "@hooks/core/adapters/fs";
import { join } from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgentListConfig {
  enabled?: boolean;
  /** Paths to list files, relative to baseDir. First found wins. */
  listFiles?: string[];
}

export interface AgentListDeps {
  fileExists: (path: string) => boolean;
  readFile: (path: string) => Result<string, PaiError>;
  readJson: <T = unknown>(path: string) => Result<T, PaiError>;
  isSubagent: () => boolean;
  baseDir: string;
  stderr: (msg: string) => void;
}

// ─── Pure Logic ──────────────────────────────────────────────────────────────

const DEFAULT_LIST_PATHS = [
  "PAI/AGENT-LIST.md",
  "MEMORY/STATE/agent-list.md",
];

function loadConfig(deps: AgentListDeps): AgentListConfig {
  const configPath = join(deps.baseDir, "PAI/agent-list-config.json");
  if (!deps.fileExists(configPath)) return {};
  const result = deps.readJson<AgentListConfig>(configPath);
  return result.ok ? result.value : {};
}

function findListFile(deps: AgentListDeps, config: AgentListConfig): string | null {
  const paths = config.listFiles || DEFAULT_LIST_PATHS;
  for (const relativePath of paths) {
    const fullPath = join(deps.baseDir, relativePath);
    if (deps.fileExists(fullPath)) return fullPath;
  }
  return null;
}

export function formatListContent(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  return `<system-reminder>
## Agent Checklist

The following checklist was loaded from your agent list file. Review these items and keep them in mind throughout this session.

${trimmed}
</system-reminder>`;
}

// ─── Contract ────────────────────────────────────────────────────────────────

const defaultDeps: AgentListDeps = {
  fileExists,
  readFile,
  readJson,
  isSubagent: () => {
    const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || "";
    return (
      claudeProjectDir.includes("/.claude/Agents/") ||
      process.env.CLAUDE_AGENT_TYPE !== undefined
    );
  },
  baseDir: process.env.PAI_DIR || join(process.env.HOME!, ".claude"),
  stderr: (msg) => process.stderr.write(msg + "\n"),
};

export const AgentList: SyncHookContract<
  SessionStartInput,
  ContextOutput | SilentOutput,
  AgentListDeps
> = {
  name: "AgentList",
  event: "SessionStart",

  accepts(_input: SessionStartInput): boolean {
    return true;
  },

  execute(
    _input: SessionStartInput,
    deps: AgentListDeps,
  ): Result<ContextOutput | SilentOutput, PaiError> {
    if (deps.isSubagent()) {
      deps.stderr("[AgentList] Subagent session — skipping");
      return ok({ type: "silent" });
    }

    const config = loadConfig(deps);
    if (config.enabled === false) {
      deps.stderr("[AgentList] Disabled via config");
      return ok({ type: "silent" });
    }

    const listPath = findListFile(deps, config);
    if (!listPath) {
      deps.stderr("[AgentList] No agent list file found");
      return ok({ type: "silent" });
    }

    const readResult = deps.readFile(listPath);
    if (!readResult.ok) {
      deps.stderr(`[AgentList] Failed to read ${listPath}: ${readResult.error.message}`);
      return ok({ type: "silent" });
    }

    const content = formatListContent(readResult.value);
    if (!content) {
      deps.stderr("[AgentList] List file is empty");
      return ok({ type: "silent" });
    }

    deps.stderr(`[AgentList] Injected agent list from ${listPath}`);
    return ok({ type: "context", content });
  },

  defaultDeps,
};
