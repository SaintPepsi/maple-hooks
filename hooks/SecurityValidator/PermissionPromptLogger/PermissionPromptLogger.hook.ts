#!/usr/bin/env bun
/**
 * PermissionPromptLogger.hook.ts — Thin shim
 *
 * Diagnostic hook that logs every permission prompt to JSONL.
 * All business logic in PermissionPromptLogger.contract.ts.
 */

import { runHook } from "@hooks/core/runner";
import { PermissionPromptLogger } from "@hooks/hooks/SecurityValidator/PermissionPromptLogger/PermissionPromptLogger.contract";

if (import.meta.main) {
  runHook(PermissionPromptLogger).catch((e) => {
    process.stderr.write(`[hook] fatal: ${e instanceof Error ? e.message : e}\n`);
    process.exit(0);
  });
}
