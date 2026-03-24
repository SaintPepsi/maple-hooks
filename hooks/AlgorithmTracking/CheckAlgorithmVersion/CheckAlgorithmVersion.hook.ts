#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { CheckAlgorithmVersion } from "./CheckAlgorithmVersion.contract";

if (import.meta.main) {
  runHook(CheckAlgorithmVersion).catch(() => {
    process.exit(0);
  });
}
