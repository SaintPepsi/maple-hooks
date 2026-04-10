/**
 * Safe JSON adapter — wraps JSON.parse so callers avoid try-catch.
 *
 * Adapter files are excluded from CodingStandardsEnforcer.
 */

import { ok, err, type Result } from "@hooks/core/result";
import { type ResultError, invalidInput } from "@hooks/core/error";

/**
 * Parse a JSON string, returning a Result instead of throwing.
 */
export function safeJsonParse(content: string): Result<Record<string, unknown>, ResultError> {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return ok(parsed);
  } catch (e) {
    return err(invalidInput(`Invalid JSON: ${e instanceof Error ? e.message : "parse error"}`));
  }
}
