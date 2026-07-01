## Overview
Auto-commits edits to Maple's identity files so their history is a clean changelog, not auto-sync noise. First hook built on the Effect kit (`core/effect/`).

## Event
PostToolUse (matcher: `Write|Edit`).

## When It Fires
After any Write or Edit whose target is one of the watched files: `CLAUDE.md`, `souls/maple/SOUL.md`, `souls/maple/STYLE.md`. Any other path is a silent no-op.

## What It Does
1. Decodes the PostToolUse input.
2. Reads the watched list from `settings.json` (`hookConfig.postEditCommit.files`) via the `readConfig` Effect program; when the key is missing or invalid it falls back to the default (the three identity files above).
3. `matchWatched` narrows `file_path` and maps it to a repo-relative path (or null).
4. `git add` the file, then `git commit` it if it has staged changes.
5. Fail-open: any error resolves to `{}`, never blocking the session.

## Examples
> Edit `~/.claude/souls/maple/STYLE.md` → commit `identity: edit STYLE.md`.
> Edit `src/app.ts` → no-op.

## Dependencies
- `core/effect/run` (`runHook`), `core/effect/git` (`git`, `hasStagedChange`), `core/effect/config` (`readConfig`)
- `lib/paths` (`getPaiDir`)
