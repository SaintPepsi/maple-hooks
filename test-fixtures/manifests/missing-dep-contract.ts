import { ok, type Result } from "@hooks/core/result";
import type { ResultError } from "@hooks/core/error";
import { readFile } from "@hooks/core/adapters/fs";
import { resolvePaiDir } from "@hooks/lib/paths";

export function execute(): Result<string, ResultError> {
  return ok(resolvePaiDir());
}
