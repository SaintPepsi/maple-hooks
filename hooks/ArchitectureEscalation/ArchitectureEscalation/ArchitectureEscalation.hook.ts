#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { ArchitectureEscalation } from "./ArchitectureEscalation.contract";

if (import.meta.main) {
  runHook(ArchitectureEscalation).catch(() => {

    process.exit(0);
  });
}
