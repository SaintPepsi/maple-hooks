#!/usr/bin/env bun
/**
 * SettingsRevert.hook.ts — Thin shim
 *
 * All business logic lives in SettingsRevert.contract.ts.
 * This file is the hook entry point that settings.json references.
 */

import { runHook } from "@hooks/core/runner";
import { SettingsRevert } from "@hooks/hooks/SecurityValidator/SettingsRevert/SettingsRevert.contract";

if (import.meta.main) {
  runHook(SettingsRevert).catch((e) => {
    process.stderr.write(`[hook] fatal: ${e instanceof Error ? e.message : e}\n`);
    process.exit(0);
  });
}
