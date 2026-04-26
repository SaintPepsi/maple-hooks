import type { ResultError } from "@hooks/core/error";
import type { Result } from "@hooks/core/result";
import type { Schema } from "effect";

/**
 * Read a hook's config section from settings.json (untyped, fail-open).
 *
 * **ESCAPE HATCH**: This overload returns unvalidated data. Prefer the
 * schema-validated overload for type safety at the config boundary.
 */
export function readHookConfig<T = Record<string, unknown>>(
  hookName: string,
  readFileFn?: (path: string) => string | null,
  settingsPath?: string,
  logStderr?: (msg: string) => void,
): T | null;

/**
 * Read and validate a hook's config section from settings.json (PREFERRED).
 *
 * Validates against `schema` using Effect Schema. Returns `Result<T, ResultError>`
 * with distinct error codes per failure mode.
 *
 * This is the recommended API: validation happens at the config boundary,
 * ensuring type safety without caller-side casts.
 */
export function readHookConfig<T>(
  hookName: string,
  schema: Schema.Schema<T>,
  readFileFn?: (path: string) => string | null,
  settingsPath?: string,
  logStderr?: (msg: string) => void,
): Result<T, ResultError>;

export function readHookConfig<T>(
  _hookName: string,
  _schemaOrReadFileFn?: Schema.Schema<T> | ((path: string) => string | null),
  _readFileFnOrSettingsPath?: ((path: string) => string | null) | string,
  _settingsPathOrLogStderr?: string | ((msg: string) => void),
  _logStderr?: (msg: string) => void,
): T | null | Result<T, ResultError> {
  return null;
}
