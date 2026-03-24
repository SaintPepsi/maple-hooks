#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { TestObligationTracker } from "@hooks/hooks/ObligationStateMachines/TestObligationTracker/TestObligationTracker.contract";

if (import.meta.main) {
  runHook(TestObligationTracker).catch(() => {
    process.exit(0);
  });
}
