import { ok, type Result } from "@hooks/core/result";
import type { ResultError } from "@hooks/core/error";

export function execute(): Result<string, ResultError> {
  return ok("no identity import");
}
