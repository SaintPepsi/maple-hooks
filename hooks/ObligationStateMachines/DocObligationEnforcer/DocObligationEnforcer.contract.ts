import type { SyncHookContract } from "@hooks/core/contract";
import type { StopInput } from "@hooks/core/types/hook-inputs";
import type { BlockOutput, SilentOutput } from "@hooks/core/types/hook-outputs";
import { ok, type Result } from "@hooks/core/result";
import type { PaiError } from "@hooks/core/error";
import { join } from "path";
import { pickNarrative } from "@hooks/lib/narrative-reader";
import {
  type DocObligationDeps,
  defaultDeps,
  projectHasHook,
  pendingPath,
  blockCountPath,
  MAX_BLOCKS,
  buildBlockLimitReview,
  buildDocSuggestions,
} from "@hooks/hooks/ObligationStateMachines/DocObligationStateMachine.shared";

export const DocObligationEnforcer: SyncHookContract<
  StopInput,
  BlockOutput | SilentOutput,
  DocObligationDeps
> = {
  name: "DocObligationEnforcer",
  event: "Stop",

  accepts(_input: StopInput): boolean {
    if (projectHasHook("DocObligationEnforcer")) return false;
    return true;
  },

  execute(
    input: StopInput,
    deps: DocObligationDeps,
  ): Result<BlockOutput | SilentOutput, PaiError> {
    const flagFile = pendingPath(deps.stateDir, input.session_id);

    if (!deps.fileExists(flagFile)) {
      return ok({ type: "silent" });
    }

    const pending = deps.readPending(flagFile);
    if (pending.length === 0) {
      return ok({ type: "silent" });
    }

    const countFile = blockCountPath(deps.stateDir, input.session_id);
    const blockCount = deps.readBlockCount(countFile);

    if (blockCount >= MAX_BLOCKS) {
      const reviewPath = join(deps.stateDir, `review-${input.session_id}.md`);
      deps.writeReview(reviewPath, buildBlockLimitReview(pending, blockCount));
      deps.removeFlag(flagFile);
      deps.removeFlag(countFile);
      deps.stderr(`[DocObligationEnforcer] Block limit (${MAX_BLOCKS}) reached for ${pending.length} file(s). Review written. Releasing session.`);
      return ok({ type: "silent" });
    }

    const opener = pickNarrative("DocObligationEnforcer", pending.length);
    const fileList = pending.map((f) => `  - ${f}`).join("\n");
    const suggestions = buildDocSuggestions(pending, deps);
    const reason = `${opener}\n\nModified files without documentation updates:\n${fileList}\n\n${suggestions}`;

    deps.writeBlockCount(countFile, blockCount + 1);
    deps.stderr(`[DocObligationEnforcer] Block ${blockCount + 1}/${MAX_BLOCKS}: ${pending.length} file(s) modified without documentation updates`);

    return ok({ type: "block", decision: "block", reason });
  },

  defaultDeps,
};
