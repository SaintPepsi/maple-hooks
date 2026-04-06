/**
 * status command — Stub for future implementation.
 */

import type { ParsedArgs } from "@hooks/cli/core/args";
import type { PaihError } from "@hooks/cli/core/error";
import type { Result } from "@hooks/cli/core/result";

export function status(_args: ParsedArgs): Result<string, PaihError> {
  return { ok: true, value: "status: not yet implemented" };
}
