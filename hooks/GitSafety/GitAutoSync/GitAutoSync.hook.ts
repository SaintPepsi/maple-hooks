#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { GitAutoSync } from "./GitAutoSync.contract";

if (import.meta.main) {
  runHook(GitAutoSync).catch(() => {
    process.exit(0);
  });
}
