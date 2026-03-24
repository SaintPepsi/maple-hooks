#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { LearningActioner } from "./LearningActioner.contract";

if (import.meta.main) {
  runHook(LearningActioner).catch(() => {
    process.exit(0);
  });
}
