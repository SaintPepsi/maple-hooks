#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { TestObligationEnforcer } from "@hooks/hooks/ObligationStateMachines/TestObligationEnforcer/TestObligationEnforcer.contract";

if (import.meta.main) {
  runHook(TestObligationEnforcer).catch(() => {
    process.exit(0);
  });
}
