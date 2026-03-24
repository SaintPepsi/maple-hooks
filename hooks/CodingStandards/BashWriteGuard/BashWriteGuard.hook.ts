#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { BashWriteGuard } from "./BashWriteGuard.contract";

if (import.meta.main) {
  runHook(BashWriteGuard).catch(() => {
    process.exit(0);
  });
}
