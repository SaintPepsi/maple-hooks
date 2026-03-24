#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { CitationEnforcement } from "@hooks/hooks/ObligationStateMachines/CitationEnforcement/CitationEnforcement.contract";

if (import.meta.main) {
  runHook(CitationEnforcement).catch(() => {
    process.exit(0);
  });
}
