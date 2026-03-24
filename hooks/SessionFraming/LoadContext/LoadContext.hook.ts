#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { LoadContext } from "./LoadContext.contract";

if (import.meta.main) {
  runHook(LoadContext).catch(() => {
    process.exit(0);
  });
}
