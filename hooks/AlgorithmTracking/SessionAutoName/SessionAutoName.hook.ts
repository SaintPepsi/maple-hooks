#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { SessionAutoName } from "./SessionAutoName.contract";

if (import.meta.main) {
  runHook(SessionAutoName).catch(() => {
    process.exit(0);
  });
}
