/**
 * AgentLifecycle Contract — Track sub-agent lifecycle via individual JSON files.
 *
 * Two contracts exported:
 *   AgentLifecycleStart — SubagentStart: creates agent file with completedAt=null
 *   AgentLifecycleStop  — SubagentStop: sets completedAt, cleans up orphans
 *
 * State files: MEMORY/STATE/agents/agent-{session_id}.json
 *   { agentId, agentType, startedAt, completedAt }
 *
 * Replaces the old counter-based AgentTrackerPre/Post approach.
 */

import type { SyncHookContract } from "@hooks/core/contract";
import type {
  SubagentStartInput,
  SubagentStopInput,
} from "@hooks/core/types/hook-inputs";
import type { SilentOutput } from "@hooks/core/types/hook-outputs";
import { ok, type Result } from "@hooks/core/result";
import type { PaiError } from "@hooks/core/error";
import {
  readFile,
  writeFile,
  fileExists,
  ensureDir,
  readDir,
  removeFile,
} from "@hooks/core/adapters/fs";
import { getPaiDir } from "@hooks/lib/paths";
import { join } from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentFileData {
  agentId: string;
  agentType: string;
  startedAt: string;
  completedAt: string | null;
}

export interface AgentLifecycleDeps {
  readFile: (path: string) => Result<string, PaiError>;
  writeFile: (path: string, content: string) => Result<void, PaiError>;
  fileExists: (path: string) => boolean;
  ensureDir: (path: string) => Result<void, PaiError>;
  readDir: (path: string) => Result<string[], PaiError>;
  removeFile: (path: string) => Result<void, PaiError>;
  getAgentsDir: () => string;
  stderr: (msg: string) => void;
  now: () => Date;
}

// ─── Default Deps ────────────────────────────────────────────────────────────

const defaultDeps: AgentLifecycleDeps = {
  readFile,
  writeFile,
  fileExists,
  ensureDir,
  readDir: (path) => readDir(path) as Result<string[], PaiError>,
  removeFile,
  getAgentsDir: () => join(getPaiDir(), "MEMORY", "STATE", "agents"),
  stderr: (msg) => process.stderr.write(msg + "\n"),
  now: () => new Date(),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORPHAN_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

function agentFilePath(deps: AgentLifecycleDeps, sessionId: string): string {
  return join(deps.getAgentsDir(), `agent-${sessionId}.json`);
}

function cleanupOrphans(
  deps: AgentLifecycleDeps,
  currentSessionId: string,
): void {
  const dirResult = deps.readDir(deps.getAgentsDir());
  if (!dirResult.ok) return;

  const nowMs = deps.now().getTime();

  for (const filename of dirResult.value) {
    if (!filename.startsWith("agent-") || !filename.endsWith(".json")) continue;

    // Extract session id from filename: agent-{id}.json
    const agentSessionId = filename.slice("agent-".length, -".json".length);

    // Never remove the current agent's file
    if (agentSessionId === currentSessionId) continue;

    const filePath = join(deps.getAgentsDir(), filename);
    const contentResult = deps.readFile(filePath);
    if (!contentResult.ok) continue;

    const data = JSON.parse(contentResult.value) as AgentFileData;

    // Only remove orphans: no completedAt and started > 30 min ago
    if (data.completedAt !== null) continue;

    const startedMs = new Date(data.startedAt).getTime();
    if (nowMs - startedMs > ORPHAN_THRESHOLD_MS) {
      deps.removeFile(filePath);
      deps.stderr(
        `[AgentLifecycle] Cleaned up orphan agent: ${data.agentId}`,
      );
    }
  }
}

// ─── SubagentStart Contract ─────────────────────────────────────────────────

export const AgentLifecycleStart: SyncHookContract<
  SubagentStartInput,
  SilentOutput,
  AgentLifecycleDeps
> = {
  name: "AgentLifecycleStart",
  event: "SubagentStart",

  accepts(_input: SubagentStartInput): boolean {
    return true;
  },

  execute(
    input: SubagentStartInput,
    deps: AgentLifecycleDeps,
  ): Result<SilentOutput, PaiError> {
    const dirResult = deps.ensureDir(deps.getAgentsDir());
    if (!dirResult.ok) {
      deps.stderr(
        `[AgentLifecycle] Start: failed to ensure agents dir: ${dirResult.error}`,
      );
      return ok({ type: "silent" });
    }

    const data: AgentFileData = {
      agentId: input.session_id,
      agentType: "unknown",
      startedAt: deps.now().toISOString(),
      completedAt: null,
    };

    const writeResult = deps.writeFile(
      agentFilePath(deps, input.session_id),
      JSON.stringify(data),
    );

    if (!writeResult.ok) {
      deps.stderr(
        `[AgentLifecycle] Start: failed to write agent file: ${writeResult.error}`,
      );
      return ok({ type: "silent" });
    }

    deps.stderr(
      `[AgentLifecycle] Start: agent=${input.session_id}`,
    );

    return ok({ type: "silent" });
  },

  defaultDeps,
};

// ─── SubagentStop Contract ──────────────────────────────────────────────────

export const AgentLifecycleStop: SyncHookContract<
  SubagentStopInput,
  SilentOutput,
  AgentLifecycleDeps
> = {
  name: "AgentLifecycleStop",
  event: "SubagentStop",

  accepts(_input: SubagentStopInput): boolean {
    return true;
  },

  execute(
    input: SubagentStopInput,
    deps: AgentLifecycleDeps,
  ): Result<SilentOutput, PaiError> {
    const filePath = agentFilePath(deps, input.session_id);
    const nowIso = deps.now().toISOString();

    let data: AgentFileData;

    if (deps.fileExists(filePath)) {
      const contentResult = deps.readFile(filePath);
      if (contentResult.ok) {
        data = JSON.parse(contentResult.value) as AgentFileData;
        data.completedAt = nowIso;
      } else {
        // Read failed on existing file — crash recovery
        deps.stderr(
          `[AgentLifecycle] Stop: read failed, crash recovery for ${input.session_id}`,
        );
        data = {
          agentId: input.session_id,
          agentType: "unknown",
          startedAt: nowIso,
          completedAt: nowIso,
        };
      }
    } else {
      // File missing — crash recovery
      deps.stderr(
        `[AgentLifecycle] Stop: file missing, crash recovery for ${input.session_id}`,
      );
      data = {
        agentId: input.session_id,
        agentType: "unknown",
        startedAt: nowIso,
        completedAt: nowIso,
      };
    }

    const writeResult = deps.writeFile(filePath, JSON.stringify(data));
    if (!writeResult.ok) {
      deps.stderr(
        `[AgentLifecycle] Stop: failed to write agent file: ${writeResult.error}`,
      );
      return ok({ type: "silent" });
    }

    deps.stderr(
      `[AgentLifecycle] Stop: agent=${input.session_id}`,
    );

    // Opportunistic orphan cleanup
    cleanupOrphans(deps, input.session_id);

    return ok({ type: "silent" });
  },

  defaultDeps,
};
