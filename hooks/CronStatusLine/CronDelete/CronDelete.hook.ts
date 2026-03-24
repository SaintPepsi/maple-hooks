#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { CronDeleteContract } from "@hooks/hooks/CronStatusLine/CronDelete/CronDelete.contract";

if (import.meta.main) {
  runHook(CronDeleteContract).catch(() => {
    process.exit(0);
  });
}
