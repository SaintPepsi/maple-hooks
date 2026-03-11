# Hook Logging — Design Doc

**Goal:** Add reusable per-hook logging to diagnose which hooks consume tokens and how much.

**Problem:** 25% of daily Claude usage is attributed to the `.claude` project directory. Investigation revealed 1,105 of 2,848 sessions (39%) in that project are automated `claude --print` calls from hooks — primarily RatingCapture (607 calls), SessionAutoName (373), and WorkCompletionLearning (75). Without per-hook logging, there's no way to attribute cost to specific hooks or track trends.

---

## Root Cause Analysis

`PAI/Tools/Inference.ts` spawns `claude --print` without setting `cwd`. The child process inherits the hook's working directory (`~/.claude`), so every inference call creates a session transcript under the `.claude` project. Each call costs ~3-5k tokens (system prompt + user prompt + response).

**Verified:**
- `claude --print` with `--setting-sources ''` still creates session transcripts (confirmed by session count not changing — actually it does NOT create transcripts in this config, but the hooks may not all use `--setting-sources ''`)
- 100% of sampled 1-10KB sessions in the `.claude` project are inference calls (rating analysis JSONs, session names, learning extractions)
- March 9: 531 sessions, of which ~400+ were inference calls. 48.4 MB total.

---

## Design

### Layer 1: Generic Hook Logger (`pai-hooks/core/hook-logger.ts`)

A reusable module any hook, tool, or the runner itself can call.

```typescript
interface HookLogEntry {
  ts: string;           // ISO timestamp
  source: string;       // "Inference", "RatingCapture", "Runner", etc.
  event: string;        // "inference_call", "hook_execute", "hook_block", etc.
  details: Record<string, unknown>;  // source-specific payload
}

function logEvent(entry: HookLogEntry): void
```

**Characteristics:**
- Fire-and-forget: never blocks, never throws
- Appends one JSONL line to `~/.claude/MEMORY/LOGS/hooks/YYYY-MM-DD.jsonl`
- Creates directory on first write
- Uses `appendFileSync` (sync to avoid race conditions, sub-ms for a single line)

### Layer 2: Inference.ts Integration

Every `inference()` call logs after the result resolves:

```jsonl
{
  "ts": "2026-03-12T08:15:00.000Z",
  "source": "Inference",
  "event": "inference_call",
  "details": {
    "caller": "RatingCapture",
    "model": "haiku",
    "level": "fast",
    "cwd": "/Users/hogers/.claude",
    "promptChars": 1200,
    "outputChars": 340,
    "latencyMs": 1850,
    "success": true
  }
}
```

Changes to `InferenceOptions`:
- Add `caller?: string` — the hook or tool name that initiated the call

Changes to `inference()`:
- After the promise resolves, call `logEvent()` with the result details
- Log regardless of success/failure

### Layer 3: Runner Integration (Future)

The hook runner (`core/runner.ts`) can also call `logEvent()`:

```jsonl
{
  "ts": "...",
  "source": "Runner",
  "event": "hook_execute",
  "details": {
    "hook": "RatingCapture",
    "hookEvent": "UserPromptSubmit",
    "tool": null,
    "accepted": true,
    "outputType": "context",
    "contextChars": 450,
    "durationMs": 2100
  }
}
```

This is not in scope for the initial implementation but the logger design supports it.

### Layer 4: CLI Report Tool (`PAI/Tools/HookReport.ts`)

Reads JSONL logs and prints a summary:

```
bun PAI/Tools/HookReport.ts                    # today
bun PAI/Tools/HookReport.ts --date 2026-03-09  # specific day
bun PAI/Tools/HookReport.ts --range 7          # last 7 days
```

Output example:
```
Hook Inference Report — 2026-03-12
═══════════════════════════════════

Source              Calls   Avg Latency   Prompt Chars   Output Chars   Est. Tokens
────────────────────────────────────────────────────────────────────────────────────
RatingCapture         47      1.8s            58,200         15,600        ~18k
SessionAutoName       23      2.1s            27,600          2,300         ~7k
WorkCompletionLrn      3      3.4s             8,100          4,200         ~3k
────────────────────────────────────────────────────────────────────────────────────
TOTAL                 73      2.0s            93,900         22,100        ~28k

Estimated daily token cost from hook inference: ~28,000 tokens
```

---

## Implementation Order

1. **`pai-hooks/core/hook-logger.ts`** — the reusable logger module
2. **`PAI/Tools/Inference.ts`** — add `caller` option and logging integration
3. **Update hook contracts** — pass `caller` name in each hook that calls `inference()`
   - `hooks/contracts/RatingCapture.ts`
   - `hooks/contracts/SessionAutoName.ts`
   - `hooks/contracts/WorkCompletionLearning.ts`
   - `hooks/contracts/RelationshipMemory.ts` (if it uses inference)
4. **`PAI/Tools/HookReport.ts`** — CLI analysis tool

---

## Future Optimizations (Discovered During Investigation)

These are NOT in scope for this task but worth noting:

1. **RatingCapture pre-filter:** 607 of 1,105 inference calls are rating analysis. Most return `null` rating. A cheap regex check for rating keywords (numbers 1-10, explicit rating language) before calling inference could eliminate 80%+ of calls.

2. **Inference.ts cwd fix:** Set `cwd` in the spawn options to the caller's actual project directory so inference sessions are attributed correctly in usage logs.

3. **Session naming batching:** Instead of naming each session individually via inference, batch names at session end or use a local heuristic for simple prompts.
