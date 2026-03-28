#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { AgentList } from "@hooks/hooks/SessionFraming/AgentList/AgentList.contract";

if (import.meta.main) {
  runHook(AgentList).catch((e) => {
    process.stderr.write(`[hook] fatal: ${e instanceof Error ? e.message : e}\n`);
    process.exit(0);
  });
}
