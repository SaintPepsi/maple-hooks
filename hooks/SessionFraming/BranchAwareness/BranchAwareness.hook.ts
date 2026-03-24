#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { BranchAwareness } from "./BranchAwareness.contract";

if (import.meta.main) {
  runHook(BranchAwareness).catch(() => {
    process.exit(0);
  });
}
