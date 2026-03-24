#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { CodingStandardsAdvisor } from "./CodingStandardsAdvisor.contract";

if (import.meta.main) {
  runHook(CodingStandardsAdvisor).catch(() => {
    process.exit(0);
  });
}
