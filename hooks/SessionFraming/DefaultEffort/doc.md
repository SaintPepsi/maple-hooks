## Overview

Injects effort-level instructions at session start based on the active model. Configure per-model effort levels (low/medium/high/max) in settings.json to automatically set reasoning depth for each session.

## Event

SessionStart

## When It Fires

- At the beginning of every new Claude Code session
- Only for primary agents (skips subagents)
- Only when config exists and model is mapped

## What It Does

1. Reads `hookConfig.defaultEffort` from settings.json
2. Detects the current model from environment variables
3. Looks up the configured effort level for that model
4. Injects a system instruction describing the expected reasoning depth

## Examples

> Configure max effort for Opus in `~/.claude/settings.json`:
> ```json
> {
>   "hookConfig": {
>     "defaultEffort": {
>       "models": {
>         "claude-opus-4-5-20251101": "max",
>         "claude-sonnet-4-5-20251101": "medium"
>       }
>     }
>   }
> }
> ```

| Effort Level | Behavior |
|--------------|----------|
| low | Minimal reasoning, concise responses |
| medium | Balanced thoroughness and efficiency |
| high | Thorough reasoning, multiple approaches |
| max | Maximum depth, step-by-step analysis, edge case verification |

## Dependencies

- `@hooks/core/adapters/process` — getEnv for model detection
- `@hooks/lib/hook-config` — readHookConfig with Effect Schema validation
- `@hooks/lib/environment` — isSubagentDefault for subagent detection
