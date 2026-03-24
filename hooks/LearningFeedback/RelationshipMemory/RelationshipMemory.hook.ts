#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { RelationshipMemory } from "./RelationshipMemory.contract";

if (import.meta.main) {
  runHook(RelationshipMemory).catch(() => {
    process.exit(0);
  });
}
