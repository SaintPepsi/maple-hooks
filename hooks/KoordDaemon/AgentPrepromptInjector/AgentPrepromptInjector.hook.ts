#!/usr/bin/env bun
/**
 * AgentPrepromptInjector.hook.ts — Thin shim
 *
 * All business logic lives in hooks/KoordDaemon/AgentPrepromptInjector/AgentPrepromptInjector.contract.ts.
 * This file is the hook entry point that settings.hooks.json references.
 */

import { runHook } from "@hooks/core/runner";
import { AgentPrepromptInjector } from "@hooks/hooks/KoordDaemon/AgentPrepromptInjector/AgentPrepromptInjector.contract";

if (import.meta.main) {
  runHook(AgentPrepromptInjector).catch((e) => {
    process.stderr.write(`[hook] fatal: ${e instanceof Error ? e.message : e}\n`);
    process.exit(0);
  });
}
