#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { contract } from "@hooks/hooks/SteeringRuleInjector/SteeringRuleValidator/SteeringRuleValidator.contract";

if (import.meta.main) {
  runHook(contract).catch((e) => {
    process.stderr.write(`[hook] fatal: ${e instanceof Error ? e.message : e}\n`);
    process.exit(0);
  });
}
