#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { DuplicationIndexBuilderContract } from "@hooks/hooks/DuplicationDetection/DuplicationIndexBuilder/DuplicationIndexBuilder.contract";

if (import.meta.main) {
  runHook(DuplicationIndexBuilderContract).catch((e) => {
    process.stderr.write(`[hook] fatal: ${e instanceof Error ? e.message : e}\n`);
    process.exit(0);
  });
}
