#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { ArticleWriter } from "./ArticleWriter.contract";

if (import.meta.main) {
  runHook(ArticleWriter).catch(() => {
    process.exit(0);
  });
}
