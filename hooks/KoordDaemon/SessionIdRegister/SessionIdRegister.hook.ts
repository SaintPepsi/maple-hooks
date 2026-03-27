#!/usr/bin/env bun
/**
 * SessionIdRegister.hook.ts — Thin shim
 *
 * All business logic lives in hooks/KoordDaemon/SessionIdRegister/SessionIdRegister.contract.ts.
 * Registers session ID with Koord daemon on session start.
 */

import { runHook } from "@hooks/core/runner";
import { SessionIdRegister } from "@hooks/hooks/KoordDaemon/SessionIdRegister/SessionIdRegister.contract";

if (import.meta.main) {
  runHook(SessionIdRegister).catch((e) => {
    process.stderr.write(`[hook] fatal: ${e instanceof Error ? e.message : e}\n`);
    process.exit(0);
  });
}
