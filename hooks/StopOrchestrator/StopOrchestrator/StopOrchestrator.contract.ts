/**
 * StopOrchestrator Contract — Single entry point for Stop event handlers.
 *
 * Reads and parses the transcript ONCE, then distributes to handlers:
 * - RebuildSkill, AlgorithmEnrichment
 */

import type { SyncHookJSONOutput } from "@anthropic-ai/claude-agent-sdk";
import type { AsyncHookContract } from "@hooks/core/contract";
import type { ResultError } from "@hooks/core/error";
import { ok, type Result } from "@hooks/core/result";
import type { StopInput } from "@hooks/core/types/hook-inputs";
import { handleAlgorithmEnrichment } from "@hooks/handlers/AlgorithmEnrichment";
import { handleRebuildSkill } from "@hooks/handlers/RebuildSkill";
import { defaultStderr, getPaiDir } from "@hooks/lib/paths";
import { parseTranscript } from "@pai/Tools/TranscriptParser";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StopOrchestratorDeps {
  parseTranscript: typeof parseTranscript;
  handleRebuildSkill: typeof handleRebuildSkill;
  handleAlgorithmEnrichment: typeof handleAlgorithmEnrichment;
  delay: (ms: number) => Promise<void>;
  baseDir: string;
  stderr: (msg: string) => void;
}

// ─── Contract ────────────────────────────────────────────────────────────────

const defaultDeps: StopOrchestratorDeps = {
  parseTranscript,
  handleRebuildSkill,
  handleAlgorithmEnrichment,
  delay: (ms) => new Promise((r) => setTimeout(r, ms)),
  baseDir: getPaiDir(),
  stderr: defaultStderr,
};

export const StopOrchestrator: AsyncHookContract<StopInput, StopOrchestratorDeps> = {
  name: "StopOrchestrator",
  event: "Stop",

  accepts(input: StopInput): boolean {
    return !!input.transcript_path;
  },

  async execute(
    input: StopInput,
    deps: StopOrchestratorDeps,
  ): Promise<Result<SyncHookJSONOutput, ResultError>> {
    // Wait for transcript to be fully written
    await deps.delay(150);

    const parsed = deps.parseTranscript(input.transcript_path!);

    const handlers: Promise<void>[] = [
      deps.handleRebuildSkill(),
      deps.handleAlgorithmEnrichment(parsed, input.session_id),
    ];
    const handlerNames = ["RebuildSkill", "AlgorithmEnrichment"];

    const results = await Promise.allSettled(handlers);

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        deps.stderr(`[StopOrchestrator] ${handlerNames[index]} handler failed: ${result.reason}`);
      }
    });

    return ok({});
  },

  defaultDeps,
};
