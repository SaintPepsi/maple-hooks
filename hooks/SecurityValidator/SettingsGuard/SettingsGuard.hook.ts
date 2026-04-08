#!/usr/bin/env bun
/**
 * SettingsGuard.hook.ts — Thin shim
 *
 * All business logic lives in SettingsGuard.contract.ts.
 * This file is the hook entry point that settings.json references.
 */

import { runHook } from "@hooks/core/runner";
import { SettingsGuard } from "@hooks/hooks/SecurityValidator/SettingsGuard/SettingsGuard.contract";

if (import.meta.main) {
  runHook(SettingsGuard).catch((e) => {
    process.stderr.write(`[hook] fatal: ${e instanceof Error ? e.message : e}\n`);
    process.exit(0);
  });
}
