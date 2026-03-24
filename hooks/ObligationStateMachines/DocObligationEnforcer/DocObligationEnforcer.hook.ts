#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { DocObligationEnforcer } from "@hooks/hooks/ObligationStateMachines/DocObligationEnforcer/DocObligationEnforcer.contract";

if (import.meta.main) {
  runHook(DocObligationEnforcer).catch(() => {
    process.exit(0);
  });
}
