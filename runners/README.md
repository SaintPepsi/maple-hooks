# Runners

Background process wrappers spawned by hook contracts at SessionEnd.

Each runner imports a prompt builder from its contract, runs `claude -p` synchronously, then handles lock/cooldown cleanup deterministically in code (not via prompt instructions).

## Runners

| Runner | Spawned by | Purpose |
|--------|-----------|---------|
| **agent-runner** | `spawnAgent()` via `lib/spawn-agent.ts` | Generic runner for any background agent. Receives config as JSON arg, runs `claude -p` synchronously, captures session ID from JSON output, logs JSONL events. BUN_TEST guard prevents accidental token burn in tests. |
| **article-writer-runner** | `ArticleWriter` contract | Runs claude to write blog articles. Auto-clones repo from `hookConfig.articleWriter.repo` to `~/.claude/cache/repos/`. Identity from `settings.json`. |
| **learning-agent-runner** | `LearningActioner` contract | Runs claude to analyze learning signals and create proposals |

## How They Work

1. Contract checks gating conditions (lock, cooldown, substance)
2. Contract spawns runner as a detached `bun` process via `spawnBackground`
3. Runner builds a prompt using the contract's exported builder function
4. Runner logs START to its log file
5. Runner calls `claude -p` synchronously via `spawnSyncSafe` with `--max-turns` cap and `CLAUDECODE` unset in env
6. Runner logs COMPLETE (with exit code) or ERROR (with message)
7. Runner cleans up lock file and writes cooldown file
8. Runner logs CLEANUP confirmation

Both runners use `spawnSyncSafe` which returns `Result` (never throws), so cleanup always executes after the sync call returns.

The lock file persists while the child claude runs, preventing recursive spawning — any SessionEnd hooks in the child session see the lock and skip.

## Log Files

Each runner appends timestamped entries to a log file for diagnostics:

| Runner | Log file | Lock file |
|--------|----------|-----------|
| agent-runner | Configured per caller (e.g. `MEMORY/SECURITY/hardening-log.jsonl`) | Configured per caller (e.g. `/tmp/pai-hardening-agent.lock`) |
| learning-agent-runner | `MEMORY/LEARNING/PROPOSALS/.analysis-log` | `MEMORY/LEARNING/PROPOSALS/.analyzing` |
| article-writer-runner | `MEMORY/ARTICLES/.writing-log` | `MEMORY/ARTICLES/.writing` |

`agent-runner` logs structured JSONL entries: `{"ts":"...","event":"completed","source":"...","exitCode":0,"session":"...","resumed":"false"}`. Legacy runners use plaintext `{ISO timestamp} {STATUS} {details}`.

## Session Resumption

`agent-runner` supports session resumption via `sessionStatePath` in `RunnerConfig`. When set:
1. Before spawning, reads the state file for a previous session ID
2. If found, passes `--resume <session-id>` to reuse cached system prompt
3. If resume fails, falls back to a fresh session automatically
4. After success, writes the new session ID to the state file for next run

This reduces token cost on repeated runs by leveraging Claude's prompt cache.

## Path Resolution

Contracts reference runners via `join(deps.baseDir, "pai-hooks/runners/<name>.ts")` where `baseDir` is `~/.claude`.

## Testing

```bash
bun test runners/
```
