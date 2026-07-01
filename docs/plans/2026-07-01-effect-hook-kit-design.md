# Effect Hook Kit — Design

**Date:** 2026-07-01

## Problem

Authoring a hook in maple-hooks is high-ceremony for low-value work. A hook that
does something trivial (auto-commit a file) still pays for a hand-rolled `Deps`
interface, `Result<T,E>`-wrapping of every side effect, a mandatory `doc.md`, and
tests. GitAutoSync spends ~90 lines of `Deps` + plumbing before it commits anything.

Two goals, in priority order:

1. **A legible golden path.** A new hook should be copy-the-shape-and-fill-the-blank.
   There should be a recitable vocabulary: "to run it I use `runHook`, to do git I
   import `git`, to read input I use the `input` arg, to decide I write a pure function."
2. **Trial Effect** as the substrate for that path — but only for what it earns:
   `Effect.gen` for readable sequential IO, a typed error channel, and `catchAll`
   for the never-block guarantee. **No dependency injection** (no `Layer`,
   `Context.Tag`, or `provide`). Plain imports only.

The first exemplar is **PostEditCommit**: a `PostToolUse` (Write|Edit) hook that
auto-commits edits to Maple's three identity files. It exists to *teach the pattern*,
not as an end in itself.

## Constraints

- **No DI.** Explicit user directive. Git functions are plain imports, not injected services.
- **Reuse, don't reinvent.** `git` wraps the existing `execSyncSafe` adapter; input is
  decoded with the existing `PostToolUseInput` Effect `Schema`. Single Source of Truth.
- **Never block a session.** Any failure resolves to a silent `{}` output, exit 0.
  Mirrors GitAutoSync's "always no-op" posture.
- **Effect is already a dependency** (`effect@^3.21.0`) — no new dep, but no hook
  *contract* uses it yet (only `Schema`/`Either` in schema/config files). This is new ground.
- **Framework gates apply.** The exemplar lives in `hooks/` and must satisfy the
  `doc.md` enforcer and `bun test` / `tsc --noEmit`.

## Approaches Considered

1. **Effect inside the existing `SyncHookContract`** — build an Effect in `execute`,
   `runSync` to their `Result` at the boundary. Keeps the runner. But it swaps `Deps`
   for `Layer`/`Context` — a *wash* on ceremony, and it doesn't give a new authoring
   pattern. Weakly answers "does Effect fit."
2. **New Effect runner + `EffectHookContract` for the whole framework** — the "Effect
   as THE framework" bet. Highest payoff long-term, but it's a migration, not a trial,
   and introduces a second contract system alongside the bespoke one (violates Single
   Source of Truth during coexistence).
3. **Standalone Effect script, wired directly in settings.json** — lowest ceremony,
   fully reversible, but teaches nothing reusable. Good for a one-off, wrong for a
   golden path.

## Chosen Approach

**"B-lite": a thin, DI-free Effect kit + the exemplar + a recipe.** Enough shared
infrastructure that a new hook is legible and cheap, layered over existing adapters —
without rewriting the 48-hook framework. It splits the difference: reusable like B,
lean like C.

Effect's role is deliberately narrow: sequencing (`gen`), typed errors, and the
never-block `catchAll`. Everything ceremonious about Effect (Layers, services,
runtime wiring) is cut.

## Architecture

### The kit — `core/effect/`

- **`git.ts`** — plain functions, each returns an `Effect`. No `Layer`, no injection.
  Each wraps the existing `execSyncSafe` adapter and maps a failed `Result` into a
  typed `GitError` on the Effect error channel.
  - `git(args: string[]): Effect.Effect<string, GitError>`
  - `hasStagedChange(rel: string): Effect.Effect<boolean, GitError>`
- **`run.ts`** — `runHook(event, program)`. The single entry point:
  1. read stdin (existing stdin adapter)
  2. decode with the `*Input` Schema for `event` (existing `hook-input-schema.ts`)
  3. run `program(input)` via `Effect.runPromise`
  4. `Effect.catchAll(() => Effect.void)` → never throws
  5. serialize output (`{}` for no-op) to `process.stdout.write`, `exit(0)`
     — mirrors the existing runner's output posture.
- **`errors.ts`** — tagged errors (`GitError`, `DecodeError`) via `Data.TaggedError`.

### A hook — `hooks/<Group>/<Name>/`

- **`logic.ts`** — pure functions (`matchWatched`, `commitMessage`). Testable directly.
- **`<Name>.ts`** — the `runHook(event, program)` entry. `program` is an `Effect.gen`
  that reads `input`, calls pure logic, and yields git effects.
- **`doc.md`** — required by the enforcer gate.

### Data flow (PostEditCommit)

```
PostToolUse(Write|Edit) fires
  → runHook reads stdin, decodes PostToolUseInput
  → matchWatched(file_path, WATCHED) → rel | null
  → null: return (→ {} no-op)
  → rel:  git(["add","--",rel]) → hasStagedChange(rel)
        → true: git(["commit","-q","-m",commitMessage(rel),"--",rel])
  → any failure: catchAll → {} (session never blocked)
```

## Data Model

- **Input types:** reuse `PostToolUseInput` / `HookInput` from
  `core/types/hook-input-schema.ts`. Not redefined. `runHook` is generic over the
  event and returns the matching decoded type as `input`.
- **Watched list:** `const WATCHED = [...] as const` — data, not code branches.
  A new watched file is a new array entry (Data Drives Behavior).
- **Errors:** `GitError`, `DecodeError` as tagged errors — the Effect error channel
  replaces `Result<T, ResultError>` for this path.

## Error Handling

Every failure mode (bad stdin, decode failure, git non-zero exit, missing repo)
funnels through `catchAll` to a silent `{}` + exit 0. The hook is fail-open by
construction: it can never block or slow a session. Errors may be written to stderr
for debugging (matching the runner's `writeErr`), but never to stdout.

## Testing Strategy

- **Unit (the bulk):** pure functions in `logic.ts` — `matchWatched` (path in/out of
  list, normalization), `commitMessage` (format). No mocking, no DI needed.
- **Integration:** `git.ts` functions against a temp git repo in a tmp dir — real
  `git add`/`commit`, assert on real repo state. (No injected fakes; the user rejected DI.)
- **Smoke:** pipe a sample `PostToolUse` JSON into `runHook` and assert `{}` on stdout
  and exit 0 for both the match and no-match paths.

## Principles Applied

- **Pure Functions for Testability** — all decisions (`matchWatched`, `commitMessage`)
  are pure and unit-tested; the Effect program is thin orchestration at the IO edge.
- **Single Source of Truth** — reuses the existing input `Schema` and `execSyncSafe`
  adapter; the watched list is the one home for "which files auto-commit."
- **Data Drives Behavior** — `WATCHED` is data; adding a file is a data change, not a
  code branch.
- **Separation of Concerns** — kit (`core/effect/`) vs hook logic (`logic.ts`) vs
  orchestration (`<Name>.ts`) are three distinct jobs.
- **Deviation — no DI:** the framework's default DIP-via-`Deps` pattern is deliberately
  dropped per user directive. Justified under principles.md "When This Doesn't Apply":
  for a hook this small, injection is ceremony that buys nothing testability doesn't
  already get from pure-function extraction. Git functions are imported directly and
  covered by integration tests against a temp repo.

## Open Questions

- **doc.md enforcer trigger:** confirm whether it keys off `*.hook.ts`/`*.contract.ts`
  specifically or any hook-dir source. The exemplar's entry file is `<Name>.ts`
  (not `.hook.ts`); may need to match the enforcer's expected filename or add config.
- **Registration:** wire the exemplar via a `settings.json` `PostToolUse` `Write|Edit`
  entry pointing at `bun .../PostEditCommit.ts`, or extend `install.ts`? Prefer whatever
  the existing hooks use for consistency.
- **Message quality:** generated message is `identity: edit <rel> (+A/-D)`. Good enough
  for a deterministic hook; a human still writes richer messages when editing by hand.

## Next

Hand to `writing-plans` for the implementation plan.
