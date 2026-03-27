#!/usr/bin/env bun
/**
 * AgentCompleteTracker.hook.ts — Thin shim
 *
 * All business logic lives in hooks/KoordDaemon/AgentCompleteTracker/AgentCompleteTracker.contract.ts.
 * Notifies Koord daemon when a background agent completes.
 */

import { runHook } from "@hooks/core/runner";
import { AgentCompleteTracker } from "@hooks/hooks/KoordDaemon/AgentCompleteTracker/AgentCompleteTracker.contract";

if (import.meta.main) {
  runHook(AgentCompleteTracker).catch((e) => {
    process.stderr.write(`[hook] fatal: ${e instanceof Error ? e.message : e}\n`);
    process.exit(0);
  });
}
