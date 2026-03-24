#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { WorkCompletionLearning } from "./WorkCompletionLearning.contract";

if (import.meta.main) {
  runHook(WorkCompletionLearning).catch(() => {
    process.exit(0);
  });
}
