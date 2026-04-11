# Adapters

Boundary layer wrapping Node builtins in `Result<T, E>`. These are the **only** files in the hook system where try-catch is permitted (via `tryCatch`/`tryCatchAsync` from `core/result.ts`).

Contracts never import Node builtins directly — all I/O goes through these adapters.

## Files

| Adapter      | Wraps                                        | Key exports                                                                                                                                                                                                      |
| ------------ | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fs.ts`      | `fs` (readFileSync, writeFileSync, etc.)     | `readFile`, `writeFile`, `writeFileExclusive`, `readJson`, `writeJson`, `fileExists`, `stat`, `ensureDir`, `removeFile`, `copyFile`, `readDir`, `appendFile`, `symlink`, `lstat`                                 |
| `process.ts` | `child_process` (execSync, spawnSync, spawn) | `exec`, `execSyncSafe`, `spawnSyncSafe`, `spawnBackground`, `spawnDetached`, `shellForPlatform`, `getEnv`, `buildChildEnv`                                                                                       |
| `stdin.ts`   | `process.stdin`                              | `readStdin(timeoutMs)` — reads stdin with timeout, returns `Result<string, E>`                                                                                                                                   |
| `log.ts`     | `fs.appendFileSync`                          | `appendHookLog(entry: HookLogEntry)` — structured JSON logging for hook execution. `HookLogEntry` = `{ ts, hook, event, status, duration_ms, session_id?, error? }` (7 fields post-SDK-Type-Foundation refactor) |
| `fetch.ts`   | `globalThis.fetch`                           | `fetchJson`, `fetchText` — HTTP requests with timeout, returns `Result<T, E>`                                                                                                                                    |

## Pattern

Every adapter function returns `Result<T, E>` instead of throwing. The `tryCatch` wrapper from `core/result.ts` converts exceptions at the boundary:

```typescript
export function readFile(path: string): Result<string, E> {
  if (!existsSync(path)) return { ok: false, error: fileNotFound(path) };
  return tryCatch(
    () => readFileSync(path, "utf-8"),
    (e) => fileReadFailed(path, e),
  );
}
```

## Testing

Tests mock the `Deps` interface in contracts, never the adapters directly. Adapter tests (`*.test.ts`) use real filesystem operations in temp directories.

## Platform Awareness

`process.ts` provides `shellForPlatform(platform?)` which returns the correct shell command array for the current OS: `["cmd.exe", "/c"]` on `win32`, `["sh", "-c"]` on POSIX systems. The `exec()` function accepts an optional `platform` parameter in its opts for testability. `getEnv(key)` wraps `process.env` access for dependency injection.

## Type Safety

`readDir` uses TypeScript overloads: call with `{ withFileTypes: true }` to get `Result<Dirent[], E>`, or without options to get `Result<string[], E>`. `spawnSyncSafe` accepts `BufferEncoding` for encoding and typed stdio options.

## Child-process Environment Policy

All spawn adapters (`exec`, `execSyncSafe`, `spawnDetached`, `spawnBackground`, `spawnSyncSafe`) default their child environment through `buildChildEnv()`. This helper derives the child env from `process.env` but **strips parent-session markers** so no spawned process inherits the parent Claude Code session flag by accident.

Stripped by default:

- `CLAUDECODE`
- `CLAUDE_CODE`
- `CLAUDE_AGENT_SDK`

**Why:** hooks spawned by `spawnAgent` (background agents) or spawned directly by other hooks would otherwise inherit `CLAUDECODE=1` from the parent session. That causes SessionStart context hooks, `VoiceGate`, and `SkillGuard` to mis-detect their runtime context — treating a fresh subagent invocation as a nested session. Stripping the markers at the adapter layer fixes `spawnAgent` and every other spawn path in one move. Callers that genuinely need the marker in the child can re-inject it via `buildChildEnv({ CLAUDECODE: "1" })` or via the explicit `env` option on `spawnSyncSafe`/`spawnBackground`.

```typescript
// Default: CLAUDECODE stripped from child
spawnBackground("bun", ["runner.ts"]);

// Override: strip everything else too, keep explicit keys
spawnSyncSafe("bun", ["hook.ts"], {
  env: { PATH: process.env.PATH }, // explicit env bypasses buildChildEnv
});

// Re-inject CLAUDECODE intentionally
spawnBackground("bun", ["agent.ts"], {
  env: { CLAUDECODE: "1" },
});
```

## Stdin Plumbing

`spawnSyncSafe` accepts an optional `input?: string` option that is written to the child's stdin before it starts. Combined with the now-captured `stderr` field on `SpawnSyncResult`, this makes the adapter a one-call wrapper for running a hook binary against a fixed stdin payload (used by the 2E dogfood harness in `MEMORY/WORK/20260410-194500_sdk-type-foundation-concerns/.issues/2E-results/run-2E.ts`).

```typescript
const r = spawnSyncSafe("bun", [hookPath], {
  cwd: REPO,
  input: JSON.stringify(hookInputPayload),
});
// r.value = { stdout, stderr, exitCode }
```
