# ObligationStateMachines

## Overview

ObligationStateMachines is a hook group implementing the **obligation pattern** — tracking pending work and enforcing completion before session end. Each state machine consists of a Tracker (PostToolUse) that monitors file changes and an Enforcer (Stop) that blocks session end when obligations are unmet.

The group includes shared utilities (`HookDocStateMachine.shared.ts`, `DocObligationStateMachine.shared.ts`, `TestObligationStateMachine.shared.ts`) that provide common state management, settings parsing, and domain helpers.

## Event

Multiple events across the group:
- **PostToolUse**: Tracker hooks monitor Edit/Write operations
- **Stop**: Enforcer hooks block session end when obligations pending

## When It Fires

Trackers fire on file modifications matching their watch patterns. Enforcers fire at session end when pending obligations exist.

## What It Does

1. **Trackers** add pending obligations when source files are modified
2. **Enforcers** check for pending obligations at session end
3. **Shared utilities** provide:
   - `isHookSourceFile(path, watchPatterns, excludePatterns)` — check if path needs tracking
   - `readHookDocSettings()` — load configuration from settings.json
   - Settings support for `excludePatterns` to skip directories like `test-corpus/`

## Examples

> Edit `hooks/MyHook/MyHook.contract.ts` → HookDocTracker adds pending doc obligation → Write `hooks/MyHook/doc.md` → obligation cleared → session end allowed

## Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| `obligation-machine` | lib | Generic state machine operations |
| `hook-config` | lib | Settings loading with 3-layer merge |
| `paths` | lib | Path resolution utilities |
