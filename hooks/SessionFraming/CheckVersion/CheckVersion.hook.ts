#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { CheckVersion } from "./CheckVersion.contract";

if (import.meta.main) {
  runHook(CheckVersion).catch(() => {
    process.exit(0);
  });
}
