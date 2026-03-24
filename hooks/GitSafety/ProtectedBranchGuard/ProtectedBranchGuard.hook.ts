#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { ProtectedBranchGuard } from "./ProtectedBranchGuard.contract";

if (import.meta.main) {
  runHook(ProtectedBranchGuard).catch(() => {
    process.exit(0);
  });
}
