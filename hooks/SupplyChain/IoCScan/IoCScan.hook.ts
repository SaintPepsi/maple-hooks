#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { IoCScan } from "@hooks/hooks/SupplyChain/IoCScan/IoCScan.contract";

if (import.meta.main) {
  runHook(IoCScan).catch((e) => {
    process.stderr.write(`[hook] fatal: ${e instanceof Error ? e.message : e}\n`);
    process.exit(0);
  });
}
