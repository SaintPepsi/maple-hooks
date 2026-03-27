#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { MergeGate } from "@hooks/hooks/GitSafety/MergeGate/MergeGate.contract";

if (import.meta.main) {
  runHook(MergeGate).catch((e) => {
    process.stderr.write(`[hook] fatal: ${e instanceof Error ? e.message : e}\n`);
    process.exit(0);
  });
}
