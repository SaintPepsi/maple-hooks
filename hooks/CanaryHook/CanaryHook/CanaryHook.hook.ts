#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { CanaryHook } from "@hooks/hooks/CanaryHook/CanaryHook/CanaryHook.contract";

if (import.meta.main) {
  runHook(CanaryHook).catch((e) => {
    process.stderr.write(`[hook] fatal: ${e instanceof Error ? e.message : e}\n`);
    process.exit(0);
  });
}
