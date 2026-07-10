# ObligationStateMachines

## Overview

ObligationStateMachines is a **group** of hooks that share one pattern: a *tracker* records an obligation when certain files change, and an *enforcer* blocks session end until that obligation is met. The group covers four obligations — hook documentation (`HookDoc*`), generic doc obligations (`DocObligation*`), test obligations (`TestObligation*`), and citations (`Citation*`) — plus `SpotCheckReview`.

`HookDocStateMachine.shared.ts` is the domain logic for the **hook-documentation** obligation: it classifies which files are hook source vs hook docs, validates that a `doc.md` contains the required section headings, and builds the suggestion text shown when docs are missing. It builds on the generic `obligation-machine` library for pending/block-count state.

A file only counts as **hook source** if its path contains a `/hooks/` segment *and* matches a watched pattern (`.contract.ts`, `hook.json`, `group.json`, `shared.ts`, `README.md`) *and* is not caught by an `excludePatterns` entry (used to skip directories like `test-corpus/`). The `/hooks/` scope guard prevents broad patterns from matching files in unrelated repositories anywhere on disk.

## Event

Not a single event — the group composes two roles:

- **`PostToolUse`** — trackers (e.g. `HookDocTracker`) watch `Write`/`Edit` and tag or clear pending obligations.
- **`Stop`** — enforcers (e.g. `HookDocEnforcer`) read the pending list and block session end until it is empty.

`HookDocStateMachine.shared.ts` is the pure domain module consumed by both roles.

## When It Fires

- A tracker fires on `PostToolUse` when a `Write`/`Edit` targets a file under a `/hooks/` tree matching a watched pattern, or a hook doc file (`doc.md`).
- An enforcer fires on `Stop` when its obligation's pending list is non-empty and `blocking` is enabled.

It does **not** apply when:

- The changed file is outside any `/hooks/` tree (e.g. a `README.md` in an unrelated repo) — it is not hook source.
- The enforcer is configured `blocking: false` (advisory stderr only).
- A project-level hook of the same name exists (`projectHasHook`).

## What It Does

1. `isHookSourceFile(path, patterns, excludePatterns)` — returns true only if `path` contains `/hooks/` **and** matches a watched pattern **and** is not caught by an exclude pattern (e.g. `test-corpus/`).
2. `isAnyDocFile(path, settings)` — detects the configured doc files (`doc.md`, plus any `additionalDocs` such as `IDEA.md`).
3. `validateDocSections(content, requiredSections)` — reports which required headings are missing from a doc.
4. `buildDocSuggestions(pending, settings)` — groups pending entries by directory and lists the doc files + required sections owed.
5. `pendingPath` / `blockCountPath` — locate the per-session obligation state files via the generic obligation machine.

```typescript
export function isHookSourceFile(
  filePath: string,
  patterns: RegExp[],
  excludePatterns: RegExp[] = [],
): boolean {
  if (!filePath.includes("/hooks/")) return false;   // scope guard: hook tree only
  if (excludePatterns.some((p) => p.test(filePath))) return false; // skip test-corpus/, etc.
  return patterns.some((p) => p.test(filePath));
}
```

## Examples

> A hook author edits `hooks/MyGroup/MyHook/MyHook.contract.ts`. `HookDocTracker` tags `MyHook` as owing a `doc.md`. At session end, `HookDocEnforcer` blocks with the list of pending docs and the required sections until `hooks/MyGroup/MyHook/doc.md` is written.

> A developer edits `~/repos/some-app/README.md`, unrelated to the hook system. Because the path has no `/hooks/` segment, `isHookSourceFile` returns false, no obligation is recorded, and session end is not blocked.

## Dependencies

- `@hooks/lib/obligation-machine` — generic pending / block-count state machine.
- `@hooks/lib/hook-config` — reads `hookConfig.hookDocEnforcer` settings.
- `node:path` (`dirname`) — pure path helpers.
- Consumed by `HookDocTracker` (PostToolUse) and `HookDocEnforcer` (Stop).
