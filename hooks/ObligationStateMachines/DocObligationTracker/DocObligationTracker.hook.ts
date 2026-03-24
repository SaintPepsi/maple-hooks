#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { DocObligationTracker } from "@hooks/hooks/ObligationStateMachines/DocObligationTracker/DocObligationTracker.contract";

if (import.meta.main) {
  runHook(DocObligationTracker).catch(() => {
    process.exit(0);
  });
}
