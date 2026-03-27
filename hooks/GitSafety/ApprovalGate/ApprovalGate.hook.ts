#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { ApprovalGate } from "@hooks/hooks/GitSafety/ApprovalGate/ApprovalGate.contract";

if (import.meta.main) {
  runHook(ApprovalGate).catch((e) => {
    process.stderr.write(`[hook] fatal: ${e instanceof Error ? e.message : e}\n`);
    process.exit(0);
  });
}
