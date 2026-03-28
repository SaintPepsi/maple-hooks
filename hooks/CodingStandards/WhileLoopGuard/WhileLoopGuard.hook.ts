#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { WhileLoopGuard } from "@hooks/hooks/CodingStandards/WhileLoopGuard/WhileLoopGuard.contract";

if (import.meta.main) {
  runHook(WhileLoopGuard).catch((e) => {
    process.stderr.write(`[hook] fatal: ${e instanceof Error ? e.message : e}\n`);
    process.exit(0);
  });
}
