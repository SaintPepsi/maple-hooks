#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { RatingCapture } from "./RatingCapture.contract";

if (import.meta.main) {
  runHook(RatingCapture).catch(() => {
    process.exit(0);
  });
}
