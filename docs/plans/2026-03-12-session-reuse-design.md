# Session Reuse Wrapper — Design Doc

**Goal:** Reduce token usage from hook inference calls by reusing Claude sessions instead of cold-starting each time.

**Evidence:** Testing with 100 Haiku sentiment analysis calls showed session reuse saves 24% tokens and 28% latency vs cold starts. Latency stays flat through 100 calls (no context growth penalty).

---

## Problem

Hooks like RatingCapture, SessionAutoName, and WorkCompletionLearning each spawn `claude --print` via Inference.ts for every invocation. Each cold start repeats the full session setup (system prompt negotiation, context initialization). At ~60 RatingCapture calls/day alone, this wastes ~20k tokens daily.

---

## Design

### `withSession` — Higher-Order Session Manager

A generic wrapper that manages session persistence and delegates actual work to an injected agent function. It doesn't know or care about inference internals.

#### Type Contract

```typescript
// Any agent function must accept these optional session fields
interface SessionAwareOptions {
  sessionId?: string;   // UUID for first call (create session)
  resume?: string;      // UUID for subsequent calls (resume session)
}

// The wrapper
async function withSession<TOptions, TResult>(
  hookName: string,
  agentFn: (options: TOptions & SessionAwareOptions) => Promise<TResult>,
  options: TOptions,
  deps?: WithSessionDeps,
): Promise<TResult>
```

#### Deps (for testability)

```typescript
interface WithSessionDeps {
  sessionsDir: string;                             // default: MEMORY/STATE/sessions/
  readFile: (path: string) => string | null;       // returns null if missing
  writeFile: (path: string, content: string) => void;
  removeFile: (path: string) => void;
  randomUUID: () => string;
}
```

#### Flow

```
withSession("RatingCapture", inference, { systemPrompt, userPrompt, level: "fast" })
  |
  +-- Read sessionsDir/RatingCapture
  |
  +-- File missing?
  |     Generate UUID
  |     Call agentFn({ ...options, sessionId: uuid })
  |     On success: write UUID to file
  |     Return result
  |
  +-- File exists?
        Read UUID
        Call agentFn({ ...options, resume: uuid })
        On success: return result
        On failure (session corrupt/gone):
          Delete session file
          Retry once with fresh session (generate new UUID, sessionId: newUuid)
          Return result
```

### State Files

```
MEMORY/STATE/sessions/
  RatingCapture              # plain text: b99866a9-2996-44ef-b5c5-df7bc48d3cbb
  SessionAutoName            # plain text: a1b2c3d4-...
  WorkCompletionLearning     # plain text: e5f6g7h8-...
```

- Plain text, one UUID per file, no JSON
- Gitignored via existing `MEMORY/STATE/` rule in .gitignore
- Machine-specific, not synced across devices
- No rotation needed — prompt caching and autocompaction handle context growth

### Changes to Inference.ts

Add two optional fields to `InferenceOptions`:

```typescript
export interface InferenceOptions {
  // ... existing fields ...
  sessionId?: string;   // Create session with this UUID
  resume?: string;      // Resume existing session
}
```

In the `inference()` function, pass these as CLI args:

```typescript
if (options.sessionId) {
  args.push("--session-id", options.sessionId);
}
if (options.resume) {
  args.push("--resume", options.resume);
}
```

Inference.ts does NOT manage sessions. It just passes them through to `claude --print`.

### Changes to Hook Contracts

Minimal — one-line change per hook:

```typescript
// Before (RatingCapture):
const result = await deps.inference({
  systemPrompt,
  userPrompt,
  expectJson: true,
  level: "fast",
});

// After:
const result = await withSession("RatingCapture", deps.inference, {
  systemPrompt,
  userPrompt,
  expectJson: true,
  level: "fast",
});
```

Same pattern for SessionAutoName, WorkCompletionLearning.

### Changes to Direct Spawners

`learning-agent-runner.ts` and `article-writer-runner.ts` spawn `claude -p` directly (not through Inference.ts). To use `withSession`, they need a thin adapter function that satisfies `SessionAwareOptions`:

```typescript
async function spawnClaude(options: SpawnOptions & SessionAwareOptions): Promise<SpawnResult> {
  const args = ["-p", options.prompt, "--max-turns", "10"];
  if (options.sessionId) args.push("--session-id", options.sessionId);
  if (options.resume) args.push("--resume", options.resume);
  // ... existing spawn logic ...
}

// Then:
const result = await withSession("LearningAgent", spawnClaude, { prompt, ... });
```

### Error Handling

- `withSession` never throws. If agentFn fails on resume, it retries once with a fresh session.
- If the retry also fails, it returns the error result (same as today's behavior without session reuse).
- Session file writes are fire-and-forget. If the file can't be written, next call just creates a fresh session.

---

## File Layout

```
pai-hooks/core/
  with-session.ts          # The withSession function + WithSessionDeps
  with-session.test.ts     # Tests

MEMORY/STATE/sessions/     # Runtime session UUID files (gitignored)
```

---

## Implementation Order

1. `pai-hooks/core/with-session.ts` + tests
2. Add `sessionId`/`resume` to `InferenceOptions` in `PAI/Tools/Inference.ts`
3. Wire `withSession` into `hooks/contracts/RatingCapture.ts`
4. Wire `withSession` into `hooks/contracts/SessionAutoName.ts`
5. Wire `withSession` into `hooks/contracts/WorkCompletionLearning.ts` (if applicable)
6. Adapt `learning-agent-runner.ts` (optional, lower priority)
7. Verify end-to-end with HookReport

---

## Expected Savings

Based on the 100-call test:
- **24% token reduction** on all hook inference calls
- **28% latency reduction** (faster hook execution)
- **~30-40k tokens/day** saved across all hooks
- **~100 fewer session files/day** in the .claude project
