#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { CronCreateContract } from "@hooks/hooks/CronStatusLine/CronCreate/CronCreate.contract";

if (import.meta.main) {
  runHook(CronCreateContract).catch(() => {
    process.exit(0);
  });
}
