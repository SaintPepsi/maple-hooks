#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { ModeAnalytics } from "./ModeAnalytics.contract";

if (import.meta.main) {
  runHook(ModeAnalytics).catch(() => {
    process.exit(0);
  });
}
