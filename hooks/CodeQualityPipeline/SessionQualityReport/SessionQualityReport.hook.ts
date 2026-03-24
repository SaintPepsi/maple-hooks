#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { SessionQualityReport } from "./SessionQualityReport.contract";

if (import.meta.main) {
  runHook(SessionQualityReport).catch(() => {
    process.exit(0);
  });
}
