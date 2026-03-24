#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { DestructiveDeleteGuard } from "./DestructiveDeleteGuard.contract";

if (import.meta.main) {
  runHook(DestructiveDeleteGuard).catch(() => {
    process.exit(0);
  });
}
