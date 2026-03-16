/**
 * SpotCheckReview — Stop hook that blocks session end when unpushed changes exist.
 *
 * On Stop, checks for unpushed git commits. If any exist, blocks with a message
 * telling the agent to spawn a Sonnet reviewer via the Agent tool. After MAX_BLOCKS
 * attempts, cleans up state and releases (escape valve).
 */

import type { SyncHookContract } from "@hooks/core/contract";
import type { StopInput } from "@hooks/core/types/hook-inputs";
import type { BlockOutput, SilentOutput } from "@hooks/core/types/hook-outputs";
import { ok, type Result } from "@hooks/core/result";
import type { PaiError } from "@hooks/core/error";
import { writeFile, readFile, fileExists as fsFileExists, removeFile } from "@hooks/core/adapters/fs";
import { execSyncSafe } from "@hooks/core/adapters/process";
import { join } from "path";
import { projectHasHook } from "@hooks/contracts/DocObligationStateMachine";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpotCheckReviewDeps {
  stateDir: string;
  getChangedFiles: () => string[];
  fileExists: (path: string) => boolean;
  readBlockCount: (path: string) => number;
  writeBlockCount: (path: string, count: number) => void;
  removeFlag: (path: string) => void;
  stderr: (msg: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_BLOCKS = 1;

function blockCountPath(stateDir: string, sessionId: string): string {
  return join(stateDir, `spot-check-block-${sessionId}.txt`);
}

function getUnpushedFiles(): string[] {
  const result = execSyncSafe("git diff @{upstream}...HEAD --name-only 2>/dev/null", { timeout: 5000 });
  if (!result.ok) return [];
  return result.value.trim().split("\n").filter(Boolean);
}

function buildBlockMessage(files: string[]): string {
  const fileList = files.map((f) => `  - ${f}`).join("\n");
  return `Before ending this session, run a spot-check code review of unpushed changes using a Sonnet agent (Agent tool with model: "sonnet").

Changed files:
${fileList}

Review for: bugs, security issues, missing error handling, code quality, and adherence to project conventions in CLAUDE.md.`;
}

// ─── Default Deps ─────────────────────────────────────────────────────────────

function getStateDir(): string {
  const paiDir = process.env.PAI_DIR || join(process.env.HOME!, ".claude");
  return join(paiDir, "MEMORY", "STATE", "spot-check");
}

const defaultDeps: SpotCheckReviewDeps = {
  stateDir: getStateDir(),
  getChangedFiles: getUnpushedFiles,
  fileExists: (path: string) => fsFileExists(path),
  readBlockCount: (path: string) => {
    const result = readFile(path);
    if (!result.ok) return 0;
    const n = parseInt(result.value.trim(), 10);
    return isNaN(n) ? 0 : n;
  },
  writeBlockCount: (path: string, count: number) => {
    writeFile(path, String(count));
  },
  removeFlag: (path: string) => {
    removeFile(path);
  },
  stderr: (msg) => process.stderr.write(msg + "\n"),
};

// ─── Contract ─────────────────────────────────────────────────────────────────

export const SpotCheckReview: SyncHookContract<
  StopInput,
  BlockOutput | SilentOutput,
  SpotCheckReviewDeps
> = {
  name: "SpotCheckReview",
  event: "Stop",

  accepts(_input: StopInput): boolean {
    if (projectHasHook("SpotCheckReview")) return false;
    return true;
  },

  execute(
    input: StopInput,
    deps: SpotCheckReviewDeps,
  ): Result<BlockOutput | SilentOutput, PaiError> {
    const files = deps.getChangedFiles();

    if (files.length === 0) {
      return ok({ type: "silent" });
    }

    const countFile = blockCountPath(deps.stateDir, input.session_id);
    const blockCount = deps.readBlockCount(countFile);

    if (blockCount >= MAX_BLOCKS) {
      deps.removeFlag(countFile);
      deps.stderr(`[SpotCheckReview] Block limit (${MAX_BLOCKS}) reached. Releasing session.`);
      return ok({ type: "silent" });
    }

    deps.writeBlockCount(countFile, blockCount + 1);
    deps.stderr(`[SpotCheckReview] Block ${blockCount + 1}/${MAX_BLOCKS}: ${files.length} unpushed file(s)`);

    return ok({ type: "block", decision: "block", reason: buildBlockMessage(files) });
  },

  defaultDeps,
};
