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

## Vocabulary

| To… | Use… |
|---|---|
| run a hook | `runHook(event, program)` — stdin, decode, fail-open exit, all handled |
| read typed input | the `input` arg (decoded via the event's Schema) |
| do git | `import { git, hasStagedChange } from "@hooks/core/effect/git"` |
| read settings.json config | `import { readConfig } from "@hooks/core/effect/config"` — `yield* readConfig(name, schema)`, an Effect that fails with `ConfigError` when unset; compose `Effect.orElseSucceed(() => default)` for a fallback |
| decide | pure functions — one file per function, named after it (unit-tested directly) |
| never block | automatic — `runHook` wraps everything in `catchAllCause` (typed failures AND defects) |

## New hook in 3 files + config

1. One file per pure function, named after it (e.g. `matchWatched.ts`), each with its own test. Narrow `unknown` input in these.
2. `hooks/<Group>/<Name>/<Name>.ts` — `runHook(event, (input) => Effect.gen(...))`.
3. `hooks/<Group>/<Name>/doc.md` — convention (not gated for `.ts` hooks, but write it).
4. Register in `~/.claude/settings.json` under the event, pointing `bun` at `<Name>.ts`.
5. If the hook needs config, add a `hookConfig.<name>` section to `settings.json` and read it with `readConfig`.

## Adding a new event

Add its `*Input` schema to the `SCHEMAS` map in `core/effect/run.ts`. That is the only place
events are enumerated (Single Source of Truth).

## Fail-open contract

Everything a hook's program does is wrapped so failures (typed errors AND thrown defects) resolve
to a silent `{}` + exit 0. A hook can never block or slow a session.

## Reference implementation

`hooks/GitSafety/PostEditCommit/` — a config-driven hook that reads its watch list from
`hookConfig.postEditCommit.files` (paths in relative, `~/`, or absolute form).

## This document evolves

These rules are not fixed. When a new standard emerges or a finding is worth keeping (a pattern
that paid off, a mistake worth not repeating), add it here so the next author inherits it. Keep
each rule short and concrete.
