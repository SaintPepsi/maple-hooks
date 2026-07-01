# core/effect — Effect hook kit

Low-ceremony Effect substrate for hooks. Effect is used only for `Effect.gen` sequencing,
typed errors, and `catchAllCause` (fail-open). No `Layer` / `Context.Tag` / DI — plain imports.

## Rules

- **One function per file, named after the function.** `matchWatched.ts` exports `matchWatched`.
  No grab-bag `logic.ts` / `utils.ts` / `helpers.ts`. A file's name is its primary export.
- **Every function has a colocated test.** `matchWatched.ts` → `matchWatched.test.ts` in the same
  folder. Pure functions test directly; effectful ones test against real resources (a temp git
  repo, a real temp settings file), not mocks.
- **Reuse existing functions before writing new ones.** Check the kit (`core/effect/*`) and the
  adapters (`core/adapters/*`, `lib/*`) first. Wrap what exists rather than reimplementing —
  `git` wraps `execSyncSafe`, `readConfig` wraps `readHookConfig`. Don't duplicate a helper that
  already exists.

See `AUTHORING.md` for the authoring recipe and the full vocabulary.

## This document evolves

These rules are not fixed. When a new standard emerges or a finding is worth keeping (a
pattern that paid off, a mistake worth not repeating), add it here so the next author inherits
it. Keep each rule short and concrete.
