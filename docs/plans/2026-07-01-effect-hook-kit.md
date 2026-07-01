# Effect Hook Kit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use ExecutingPlans to implement this plan task-by-task.

**Goal:** A DI-free Effect "hook kit" (`core/effect/`) plus a `PostEditCommit` exemplar that auto-commits edits to Maple's identity files, establishing a legible golden path for authoring hooks.

**Architecture:** Effect is used only for `Effect.gen` sequencing, a typed error channel, and `catchAll` (never-block). No `Layer`/`Context.Tag`/`provide` — git and stdin are plain imported functions that wrap the existing `execSyncSafe`/`readStdin` adapters and return `Effect`s. Pure decision logic lives in per-hook `logic.ts` files. Input is decoded with the existing `PostToolUseInput` Schema (Single Source of Truth).

**Tech Stack:** TypeScript, Bun, `effect@^3.21.0` (`Effect`, `Schema`, `Data`), existing maple-hooks adapters.

Design doc: `docs/plans/2026-07-01-effect-hook-kit-design.md`.

---

## Conventions & Grounding Facts

- All commands run from `~/.claude/maple-hooks`.
- Path alias `@hooks/*` → repo root (used by existing code).
- `execSyncSafe(cmd, {cwd})` → `Result<string, ResultError>` — `core/adapters/process.ts:146`.
- `readStdin(timeoutMs?)` → `Promise<Result<string, ResultError>>` — `core/adapters/stdin.ts:12`.
- `Result` has `.ok: boolean`, `.value` (on ok), `.error` (on err) — `core/result.ts:10`.
- `PostToolUseInput` is `Schema.Struct` with `tool_input: Record(String, Unknown)` — `core/types/hook-input-schema.ts:51`. So `file_path` is `unknown` and MUST be narrowed.
- `getPaiDir()` returns the `~/.claude` dir — `lib/paths.ts` (imported by GitAutoSync).
- **doc.md gate** watches only `*.contract.ts`, `hook.json`, `group.json`, `shared.ts`, `README.md` (`hooks/ObligationStateMachines/HookDocStateMachine.shared.ts:67-73`). Our `.ts` files do NOT trip it. **Do not name the recipe `README.md`** — use `AUTHORING.md`.
- Gates to pass at the end: `bun test` and `bunx tsc --noEmit`.

---

### Task 1: Tagged errors

**Files:**
- Create: `core/effect/errors.ts`
- Test: `core/effect/errors.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "bun:test";
import { DecodeError, GitError } from "./errors";

describe("tagged errors", () => {
  it("GitError carries command + message and is tagged", () => {
    const e = new GitError({ command: "git add x", message: "boom" });
    expect(e._tag).toBe("GitError");
    expect(e.command).toBe("git add x");
    expect(e.message).toBe("boom");
  });

  it("DecodeError is tagged", () => {
    expect(new DecodeError({ message: "bad json" })._tag).toBe("DecodeError");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test core/effect/errors.test.ts`
Expected: FAIL — cannot find module `./errors`.

**Step 3: Write minimal implementation**

```typescript
import { Data } from "effect";

/** git invocation failed (non-zero exit or spawn error). */
export class GitError extends Data.TaggedError("GitError")<{
  readonly command: string;
  readonly message: string;
}> {}

/** stdin was unreadable or did not match the expected hook input schema. */
export class DecodeError extends Data.TaggedError("DecodeError")<{
  readonly message: string;
}> {}
```

**Step 4: Run test to verify it passes**

Run: `bun test core/effect/errors.test.ts`
Expected: PASS (2 tests).

**Step 5: Commit**

```bash
git add core/effect/errors.ts core/effect/errors.test.ts
git commit -m "feat(effect-hooks): tagged GitError/DecodeError for the Effect kit"
```

---

### Task 2: git functions (no DI, wraps existing adapter)

**Files:**
- Create: `core/effect/git.ts`
- Test: `core/effect/git.test.ts` (integration, real temp repo)

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gitIn, hasStagedChangeIn } from "./git";

function tmpRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "effkit-"));
  execSync("git init -q && git config user.email t@t && git config user.name t", { cwd: dir });
  return dir;
}

describe("git effects", () => {
  it("hasStagedChangeIn is false with nothing staged, true after add", async () => {
    const dir = tmpRepo();
    writeFileSync(join(dir, "a.txt"), "hi");

    const before = await Effect.runPromise(hasStagedChangeIn(dir, "a.txt"));
    expect(before).toBe(false);

    await Effect.runPromise(gitIn(dir, ["add", "--", "a.txt"]));
    const after = await Effect.runPromise(hasStagedChangeIn(dir, "a.txt"));
    expect(after).toBe(true);
  });

  it("gitIn commits only the staged file", async () => {
    const dir = tmpRepo();
    writeFileSync(join(dir, "a.txt"), "hi");
    await Effect.runPromise(gitIn(dir, ["add", "--", "a.txt"]));
    await Effect.runPromise(gitIn(dir, ["commit", "-q", "-m", "msg", "--", "a.txt"]));
    const log = execSync("git log --oneline", { cwd: dir, encoding: "utf-8" });
    expect(log).toContain("msg");
  });
});
```

> **Why `gitIn`/`hasStagedChangeIn` (cwd param):** keeping `cwd` a parameter makes the functions testable against a temp repo without DI. `git`/`hasStagedChange` (Task 5-adjacent) are thin wrappers that pass `getPaiDir()`.

**Step 2: Run test to verify it fails**

Run: `bun test core/effect/git.test.ts`
Expected: FAIL — cannot find module `./git`.

**Step 3: Write minimal implementation**

```typescript
import { Effect } from "effect";
import { execSyncSafe } from "@hooks/core/adapters/process";
import { getPaiDir } from "@hooks/lib/paths";
import { GitError } from "./errors";

/** Shell-quote an argument only when it contains something outside a safe set. */
function quote(arg: string): string {
  return /^[A-Za-z0-9_./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, "'\\''")}'`;
}

/** Run a git command in `cwd`. Fails with GitError on non-zero exit / spawn error. */
export const gitIn = (cwd: string, args: string[]): Effect.Effect<string, GitError> =>
  Effect.suspend(() => {
    const command = `git ${args.map(quote).join(" ")}`;
    const result = execSyncSafe(command, { cwd });
    return result.ok
      ? Effect.succeed(result.value)
      : Effect.fail(new GitError({ command, message: result.error.message }));
  });

/**
 * True if `rel` has staged changes in `cwd`. `git diff --cached --quiet` exits 0
 * when there is no staged change (→ false) and 1 when there is (→ GitError → true).
 */
export const hasStagedChangeIn = (cwd: string, rel: string): Effect.Effect<boolean, never> =>
  gitIn(cwd, ["diff", "--cached", "--quiet", "--", rel]).pipe(
    Effect.as(false),
    Effect.catchTag("GitError", () => Effect.succeed(true)),
  );

const CLAUDE_DIR = getPaiDir();

/** git in the ~/.claude repo. */
export const git = (args: string[]): Effect.Effect<string, GitError> => gitIn(CLAUDE_DIR, args);

/** hasStagedChange in the ~/.claude repo. */
export const hasStagedChange = (rel: string): Effect.Effect<boolean, never> =>
  hasStagedChangeIn(CLAUDE_DIR, rel);
```

**Step 4: Run test to verify it passes**

Run: `bun test core/effect/git.test.ts`
Expected: PASS (2 tests).

**Step 5: Commit**

```bash
git add core/effect/git.ts core/effect/git.test.ts
git commit -m "feat(effect-hooks): git/hasStagedChange effects wrapping execSyncSafe (no DI)"
```

---

### Task 3: runHook entry point

**Files:**
- Create: `core/effect/run.ts`
- Test: `core/effect/run.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { buildPipeline } from "./run";

const SAMPLE = JSON.stringify({
  session_id: "s",
  transcript_path: "/t",
  cwd: "/c",
  hook_event_name: "PostToolUse",
  tool_name: "Edit",
  tool_input: { file_path: "/x/CLAUDE.md" },
});

describe("buildPipeline", () => {
  it("passes decoded input to the program", async () => {
    let seen: unknown;
    await Effect.runPromise(
      buildPipeline("PostToolUse", SAMPLE, (input) =>
        Effect.sync(() => {
          seen = input.tool_input.file_path;
        }),
      ),
    );
    expect(seen).toBe("/x/CLAUDE.md");
  });

  it("never rejects on bad json (fail-open)", async () => {
    const exit = await Effect.runPromise(
      buildPipeline("PostToolUse", "not json", () => Effect.void).pipe(Effect.either),
    );
    expect(exit._tag).toBe("Right"); // resolved, not failed
  });
});
```

> **Why `buildPipeline` is separate from `runHook`:** `runHook` does real stdin + `process.exit`, which is untestable. `buildPipeline(event, raw, program)` is the pure-ish Effect that the test drives with a literal `raw` string. `runHook` is the thin glue that reads stdin and runs it.

**Step 2: Run test to verify it fails**

Run: `bun test core/effect/run.test.ts`
Expected: FAIL — cannot find module `./run`.

**Step 3: Write minimal implementation**

```typescript
import { Effect, Schema } from "effect";
import { readStdin } from "@hooks/core/adapters/stdin";
import { PostToolUseInput } from "@hooks/core/types/hook-input-schema";

const SCHEMAS = {
  PostToolUse: PostToolUseInput,
} as const;

export type HookEvent = keyof typeof SCHEMAS;
export type InputOf<E extends HookEvent> = Schema.Schema.Type<(typeof SCHEMAS)[E]>;

/** The decode+run pipeline, fail-open. Exposed for testing with a literal `raw`. */
export function buildPipeline<E extends HookEvent, Err>(
  event: E,
  raw: string,
  program: (input: InputOf<E>) => Effect.Effect<void, Err>,
): Effect.Effect<void, never> {
  return Schema.decodeUnknown(Schema.parseJson(SCHEMAS[event]))(raw).pipe(
    Effect.flatMap((input) => program(input as InputOf<E>)),
    Effect.catchAll(() => Effect.void),
  );
}

/**
 * Entry point for an Effect hook. Reads stdin, decodes to the typed input for
 * `event`, runs `program`. NEVER throws or blocks: any failure resolves to a
 * silent `{}` on stdout, exit 0.
 */
export function runHook<E extends HookEvent, Err>(
  event: E,
  program: (input: InputOf<E>) => Effect.Effect<void, Err>,
): void {
  const main = Effect.gen(function* () {
    const raw = yield* Effect.promise(() => readStdin());
    if (!raw.ok) return;
    yield* buildPipeline(event, raw.value, program);
  });

  void Effect.runPromise(main).then(() => {
    process.stdout.write("{}");
    process.exit(0);
  });
}
```

**Step 4: Run test to verify it passes**

Run: `bun test core/effect/run.test.ts`
Expected: PASS (2 tests).

**Step 5: Commit**

```bash
git add core/effect/run.ts core/effect/run.test.ts
git commit -m "feat(effect-hooks): runHook entry (stdin, schema decode, fail-open exit)"
```

---

### Task 4: PostEditCommit pure logic

**Files:**
- Create: `hooks/GitSafety/PostEditCommit/logic.ts`
- Test: `hooks/GitSafety/PostEditCommit/logic.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "bun:test";
import { WATCHED, commitMessage, matchWatched } from "./logic";

const DIR = "/home/u/.claude";

describe("matchWatched", () => {
  it("returns the rel path for a watched file (absolute)", () => {
    expect(matchWatched(`${DIR}/souls/maple/STYLE.md`, WATCHED, DIR)).toBe("souls/maple/STYLE.md");
  });
  it("expands a leading ~", () => {
    expect(matchWatched("~/CLAUDE.md", WATCHED, DIR)).toBe("CLAUDE.md");
  });
  it("returns null for an unwatched file", () => {
    expect(matchWatched(`${DIR}/notes.md`, WATCHED, DIR)).toBeNull();
  });
  it("returns null for non-string (unknown) input", () => {
    expect(matchWatched(42, WATCHED, DIR)).toBeNull();
    expect(matchWatched(undefined, WATCHED, DIR)).toBeNull();
  });
});

describe("commitMessage", () => {
  it("names the file", () => {
    expect(commitMessage("souls/maple/STYLE.md")).toBe("identity: edit STYLE.md");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test hooks/GitSafety/PostEditCommit/logic.test.ts`
Expected: FAIL — cannot find module `./logic`.

**Step 3: Write minimal implementation**

```typescript
import { basename } from "node:path";

/** The identity files that auto-commit on edit. Data, not code branches. */
export const WATCHED = [
  "CLAUDE.md",
  "souls/maple/SOUL.md",
  "souls/maple/STYLE.md",
] as const;

/**
 * If `filePath` is a watched identity file under `claudeDir`, return its
 * repo-relative path; otherwise null. Accepts `unknown` and narrows: the hook
 * input types `file_path` as unknown, so narrowing lives here (pure + tested).
 */
export function matchWatched(
  filePath: unknown,
  watched: readonly string[],
  claudeDir: string,
): string | null {
  if (typeof filePath !== "string") return null;
  const norm = filePath.replace(/^~(?=\/)/, claudeDir);
  return watched.find((rel) => norm === `${claudeDir}/${rel}`) ?? null;
}

export function commitMessage(rel: string): string {
  return `identity: edit ${basename(rel)}`;
}
```

**Step 4: Run test to verify it passes**

Run: `bun test hooks/GitSafety/PostEditCommit/logic.test.ts`
Expected: PASS (6 tests).

**Step 5: Commit**

```bash
git add hooks/GitSafety/PostEditCommit/logic.ts hooks/GitSafety/PostEditCommit/logic.test.ts
git commit -m "feat(PostEditCommit): pure matchWatched/commitMessage with unknown narrowing"
```

---

### Task 5: PostEditCommit entry + doc

**Files:**
- Create: `hooks/GitSafety/PostEditCommit/PostEditCommit.ts`
- Create: `hooks/GitSafety/PostEditCommit/doc.md`

**Config-driven watched list.** The watched files are configuration, not a constant — they live in `settings.json` under `hookConfig.postEditCommit.files` and are read via the maple-hooks convention `readHookConfig(hookName, schema)` (`lib/hook-config.ts`). `WATCHED` (Task 4) is demoted to the built-in **default** used when the hook is unconfigured. Add a pure `resolveWatched(configFiles)` helper to `logic.ts` (+ test): returns `configFiles` when it's a non-empty array, else `WATCHED`. `matchWatched` stays pure — only the source of its `watched` argument changes.

`logic.ts` addition:

```typescript
/** The configured watch list, or the built-in default when unset/empty. Pure. */
export function resolveWatched(configFiles: readonly string[] | undefined): readonly string[] {
  return configFiles && configFiles.length > 0 ? configFiles : WATCHED;
}
```

**Step 1: Write the entry (the whole hook — no DI, config from settings.json)**

```typescript
import { Effect, Schema } from "effect";
import { git, hasStagedChange } from "@hooks/core/effect/git";
import { runHook } from "@hooks/core/effect/run";
import { readHookConfig } from "@hooks/lib/hook-config";
import { getPaiDir } from "@hooks/lib/paths";
import { commitMessage, matchWatched, resolveWatched } from "./logic";

const CLAUDE_DIR = getPaiDir();

// Config lives in settings.json under hookConfig.postEditCommit.files; falls back to the default.
const ConfigSchema = Schema.Struct({ files: Schema.optional(Schema.Array(Schema.String)) });
const cfg = readHookConfig("postEditCommit", ConfigSchema);
const files = resolveWatched(cfg.ok ? cfg.value.files : undefined);

runHook("PostToolUse", (input) =>
  Effect.gen(function* () {
    const rel = matchWatched(input.tool_input.file_path, files, CLAUDE_DIR);
    if (!rel) return; // not an identity file → silent no-op
    yield* git(["add", "--", rel]);
    if (yield* hasStagedChange(rel)) {
      yield* git(["commit", "-q", "-m", commitMessage(rel), "--", rel]);
    }
  }),
);
```

**Step 2: Verify types compile**

Run: `bunx tsc --noEmit`
Expected: no errors. (Confirms `input.tool_input.file_path` flows as `unknown` into `matchWatched`.)

**Step 3: Write the doc**

```markdown
## Overview
Auto-commits edits to Maple's identity files so their history is a clean changelog, not auto-sync noise. First hook built on the Effect kit (`core/effect/`).

## Event
PostToolUse (matcher: `Write|Edit`).

## When It Fires
After any Write or Edit whose target is one of the watched files: `CLAUDE.md`, `souls/maple/SOUL.md`, `souls/maple/STYLE.md`. Any other path is a silent no-op.

## What It Does
1. Decodes the PostToolUse input.
2. `matchWatched` narrows `file_path` and maps it to a repo-relative path (or null).
3. `git add` the file, then `git commit` it if it has staged changes.
4. Fail-open: any error resolves to `{}`, never blocking the session.

## Examples
> Edit `~/.claude/souls/maple/STYLE.md` → commit `identity: edit STYLE.md`.
> Edit `src/app.ts` → no-op.

## Dependencies
- `core/effect/run` (`runHook`), `core/effect/git` (`git`, `hasStagedChange`)
- `lib/paths` (`getPaiDir`)
```

**Step 4: Commit**

```bash
git add hooks/GitSafety/PostEditCommit/PostEditCommit.ts hooks/GitSafety/PostEditCommit/doc.md
git commit -m "feat(PostEditCommit): Effect-kit hook entry + doc"
```

---

### Task 6: Authoring recipe

**Files:**
- Create: `core/effect/AUTHORING.md` (NOT `README.md` — that name trips the doc gate)

**Step 1: Write the recipe**

```markdown
# Authoring an Effect hook

The low-ceremony path. No `Deps`, no `Result` plumbing, no `Layer`/DI — plain imports.

## Vocabulary
| To… | Use… |
|---|---|
| run a hook | `runHook(event, program)` — stdin, decode, fail-open exit, all handled |
| read typed input | the `input` arg (decoded via the event's Schema) |
| do git | `import { git, hasStagedChange } from "@hooks/core/effect/git"` |
| decide | pure functions in a `logic.ts` (unit-tested directly) |
| never block | automatic — `runHook` wraps everything in `catchAll` |

## New hook in 3 files + 1 line
1. `hooks/<Group>/<Name>/logic.ts` — pure functions. Narrow `unknown` input here.
2. `hooks/<Group>/<Name>/<Name>.ts` — `runHook(event, (input) => Effect.gen(...))`.
3. `hooks/<Group>/<Name>/doc.md` — convention (not gated for `.ts` hooks, but write it).
4. Register in `~/.claude/settings.json` under the event, pointing `bun` at `<Name>.ts`.

## Adding a new event
Add its `*Input` schema to the `SCHEMAS` map in `core/effect/run.ts`. That is the
only place events are enumerated (Single Source of Truth).

See `hooks/GitSafety/PostEditCommit/` as the reference implementation.
```

**Step 2: Commit**

```bash
git add core/effect/AUTHORING.md
git commit -m "docs(effect-hooks): authoring recipe for the golden path"
```

---

### Task 7: Register the hook + full gate check

**Files:**
- Modify: `~/.claude/settings.json` (PostToolUse → add a `Write|Edit` entry)

**Step 1: Add the registration entry**

Add to `hooks.PostToolUse` (alongside the existing `Write|Edit` entries):

```json
{
  "matcher": "Write|Edit",
  "hooks": [
    { "type": "command", "command": "bun ${SAINTPEPSI_PAI_HOOKS_DIR}/hooks/GitSafety/PostEditCommit/PostEditCommit.ts" }
  ]
}
```

> If maple-hooks uses `install.ts`/`export-hooks.ts` to manage settings, prefer running that instead of hand-editing, then verify the entry landed. Check `scripts/export-hooks.ts` first.

**Step 2: Run the full gates**

Run: `bun test`
Expected: all pass, including the new `core/effect/*` and `PostEditCommit` tests.

Run: `bunx tsc --noEmit`
Expected: no type errors.

**Step 3: Manual end-to-end verification**

```bash
echo '{"session_id":"s","transcript_path":"/t","cwd":"/c","hook_event_name":"PostToolUse","tool_name":"Edit","tool_input":{"file_path":"'"$HOME"'/.claude/CLAUDE.md"}}' \
  | bun ~/.claude/maple-hooks/hooks/GitSafety/PostEditCommit/PostEditCommit.ts
# then, after making a real edit to STYLE.md, confirm a commit appeared:
git -C ~/.claude log --oneline -1
```

Expected: stdout is `{}`, exit 0; when the watched file has a real change, a `identity: edit …` commit exists.

**Step 4: Commit**

```bash
git -C ~/.claude add settings.json
git -C ~/.claude commit -m "chore(hooks): register PostEditCommit PostToolUse hook"
```

---

### Task 8: Retire the redundant CLAUDE.md note

Once the hook is verified committing identity edits, the "commit each rule change on its own" prose in `~/.claude/CLAUDE.md` is now enforced mechanically and can be trimmed to a one-line pointer (the original goal: get it out of context).

**Files:**
- Modify: `~/.claude/CLAUDE.md` (the evolving-doc blockquote)

**Step 1:** Replace the multi-line blockquote with a single line noting the PostEditCommit hook now auto-commits identity edits. (Editing `CLAUDE.md` will itself trigger the hook — a live confirmation.)

**Step 2: Verify** `git -C ~/.claude log --oneline -2` shows the auto-commit from the hook.

---

## Principles Applied

- **Pure Functions for Testability** — `matchWatched`/`commitMessage` are pure; the Effect programs are thin IO orchestration. `gitIn`/`buildPipeline` take params (`cwd`, `raw`) so they test without DI.
- **Single Source of Truth** — reuses `PostToolUseInput` Schema and `execSyncSafe`; `SCHEMAS` map is the one event registry; `WATCHED` is the one home for auto-commit targets.
- **Data Drives Behavior** — `WATCHED` and `SCHEMAS` are data; new files/events are data additions.
- **Separation of Concerns** — kit (`core/effect/`) vs pure logic (`logic.ts`) vs orchestration (`<Name>.ts`).
- **Deviation — no DI:** deliberate per directive; justified because pure-function extraction already delivers testability, and integration tests cover git against a temp repo.
