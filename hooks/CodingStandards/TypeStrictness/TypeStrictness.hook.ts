#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { TypeStrictness } from "./TypeStrictness.contract";

if (import.meta.main) {
  runHook(TypeStrictness).catch(() => {
    process.exit(0);
  });
}
