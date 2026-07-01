# Authoring an Effect hook

The low-ceremony path. No `Deps`, no `Result` plumbing, no `Layer`/DI — plain imports.

## Vocabulary
| To… | Use… |
|---|---|
| run a hook | `runHook(event, program)` — stdin, decode, fail-open exit, all handled |
| read typed input | the `input` arg (decoded via the event's Schema) |
| do git | `import { git, hasStagedChange } from "@hooks/core/effect/git"` |
| read settings.json config | `import { readConfig } from "@hooks/core/effect/config"` — `yield* readConfig(name, schema)`, an Effect that fails with `ConfigError` when unset; compose `Effect.orElseSucceed(() => default)` for a fallback |
| decide | pure functions in a `logic.ts` (unit-tested directly) |
| never block | automatic — `runHook` wraps everything in `catchAllCause` (typed failures AND defects) |

## New hook in 3 files + config
1. `hooks/<Group>/<Name>/logic.ts` — pure functions. Narrow `unknown` input here.
2. `hooks/<Group>/<Name>/<Name>.ts` — `runHook(event, (input) => Effect.gen(...))`.
3. `hooks/<Group>/<Name>/doc.md` — convention (not gated for `.ts` hooks, but write it).
4. Register in `~/.claude/settings.json` under the event, pointing `bun` at `<Name>.ts`.
5. If the hook needs config, add a `hookConfig.<name>` section to `settings.json` and read it with `readConfig`.

## Adding a new event
Add its `*Input` schema to the `SCHEMAS` map in `core/effect/run.ts`. That is the
only place events are enumerated (Single Source of Truth).

## Fail-open contract
Everything a hook's program does is wrapped so failures (typed errors AND thrown
defects) resolve to a silent `{}` + exit 0. A hook can never block or slow a session.

See `hooks/GitSafety/PostEditCommit/` as the reference implementation — a config-driven
hook that reads its watch list from `hookConfig.postEditCommit.files`.
