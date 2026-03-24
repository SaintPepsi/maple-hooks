#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { CodeQualityGuard } from "./CodeQualityGuard.contract";

if (import.meta.main) {
  runHook(CodeQualityGuard).catch(() => {

    process.exit(0);
  });
}
