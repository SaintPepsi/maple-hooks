/**
 * hooks/core — Barrel export for the PAI hook infrastructure.
 *
 * Contracts import from './core' only. This is the single entry point.
 */

export { type FetchResult, safeFetch } from "./adapters/fetch";
export {
  appendFile,
  ensureDir,
  fileExists,
  readFile,
  readJson,
  writeFile,
  writeJson,
} from "./adapters/fs";
export { type ExecResult, exec, getEnv, spawnDetached } from "./adapters/process";
// Adapters
export { readStdin } from "./adapters/stdin";
// Contract interface
export type { HookContract } from "./contract";
// Error types
export {
  cancelled,
  contractViolation,
  dirCreateFailed,
  ErrorCode,
  envVarMissing,
  fetchFailed,
  fetchTimeout,
  fileNotFound,
  fileReadFailed,
  fileWriteFailed,
  invalidInput,
  jsonParseFailed,
  PaiError,
  processExecFailed,
  processSpawnFailed,
  securityBlock,
  stateCorrupted,
  stdinReadFailed,
  stdinTimeout,
  unknownError,
} from "./error";
// Result type
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
  tryCatch,
  tryCatchAsync,
  unwrapOr,
} from "./result";
// Runner
export { type RunHookOptions, runHook } from "./runner";
// Input types
export type {
  HookEventType,
  HookInput,
  HookInputBase,
  SessionEndInput,
  SessionStartInput,
  StopInput,
  ToolHookInput,
  UserPromptSubmitInput,
} from "./types/hook-inputs";
// Output types
export {
  type AskOutput,
  ask,
  type BlockOutput,
  block,
  type ContextOutput,
  type ContinueOutput,
  context,
  continueOk,
  type HookOutput,
  type SilentOutput,
  silent,
} from "./types/hook-outputs";
