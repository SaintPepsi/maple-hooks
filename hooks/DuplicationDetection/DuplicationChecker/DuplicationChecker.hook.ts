#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { DuplicationCheckerContract } from "@hooks/hooks/DuplicationDetection/DuplicationChecker/DuplicationChecker.contract";

if (import.meta.main) {
  runHook(DuplicationCheckerContract).catch((e) => {
    process.stderr.write(`[hook] fatal: ${e instanceof Error ? e.message : e}\n`);
    process.exit(0);
  });
}
