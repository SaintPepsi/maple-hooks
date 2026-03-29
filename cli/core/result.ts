/**
 * CLI Result — Re-exports core Result types for CLI usage.
 *
 * The CLI uses the same Result<T, E> foundation as the hook system.
 * Re-exporting keeps a single source of truth while allowing
 * CLI code to import from @hooks/cli/core/result.
 */

export {
  andThen,
  collectResults,
  type Err,
  err,
  map,
  mapError,
  match,
  type Ok,
  ok,
  partitionResults,
  type Result,
  unwrapOr,
} from "@hooks/core/result";
