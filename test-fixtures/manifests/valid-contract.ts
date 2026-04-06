import { ok, type Result } from "@hooks/core/result";
import type { ResultError } from "@hooks/core/error";
import { readFile } from "@hooks/core/adapters/fs";

export function execute(): Result<string, ResultError> {
  void readFile;
  return ok("valid");
}
