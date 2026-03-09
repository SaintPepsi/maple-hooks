#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { IntegrityCheck } from "@hooks/contracts/IntegrityCheck";

if (import.meta.main) {
  runHook(IntegrityCheck).catch(() => {
    process.exit(0);
  });
}
