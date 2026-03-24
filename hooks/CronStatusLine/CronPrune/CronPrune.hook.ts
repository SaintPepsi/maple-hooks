#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { CronPrune } from "@hooks/hooks/CronStatusLine/CronPrune/CronPrune.contract";

if (import.meta.main) {
  runHook(CronPrune).catch(() => {
    process.exit(0);
  });
}
