#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { TypeCheckVerifier } from "./TypeCheckVerifier.contract";

if (import.meta.main) {
  runHook(TypeCheckVerifier).catch(() => {
    process.exit(0);
  });
}
