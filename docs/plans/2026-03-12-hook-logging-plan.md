# Hook Logging Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add reusable per-hook logging so we can diagnose which hooks consume tokens and how much, then use the data to optimize.

**Architecture:** A generic `logEvent()` function in `pai-hooks/core/hook-logger.ts` writes JSONL to `~/.claude/MEMORY/LOGS/hooks/`. Inference.ts is the first consumer, logging every `claude --print` call with caller, model, cwd, prompt/output size, and latency. A CLI report tool reads the logs and prints summaries.

**Tech Stack:** TypeScript (bun), JSONL, bun:test

**Design doc:** `pai-hooks/docs/plans/2026-03-12-hook-logging-design.md`

---

## Task 1: Generic Hook Logger Module

**Files:**
- Create: `pai-hooks/core/hook-logger.ts`
- Create: `pai-hooks/core/hook-logger.test.ts`

**Step 1: Write the failing test**

```typescript
// pai-hooks/core/hook-logger.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { logEvent, type HookLogEntry } from "./hook-logger";
import { mkdirSync, rmSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const TEST_LOG_DIR = "/tmp/pai-hook-logger-test";

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function readLogLines(dir: string): HookLogEntry[] {
  const file = join(dir, `${todayDate()}.jsonl`);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe("hook-logger", () => {
  beforeEach(() => {
    rmSync(TEST_LOG_DIR, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(TEST_LOG_DIR, { recursive: true, force: true });
  });

  it("creates log directory and writes JSONL entry", () => {
    const entry: HookLogEntry = {
      ts: new Date().toISOString(),
      source: "TestHook",
      event: "test_event",
      details: { foo: "bar" },
    };

    logEvent(entry, TEST_LOG_DIR);

    const lines = readLogLines(TEST_LOG_DIR);
    expect(lines).toHaveLength(1);
    expect(lines[0].source).toBe("TestHook");
    expect(lines[0].event).toBe("test_event");
    expect(lines[0].details).toEqual({ foo: "bar" });
  });

  it("appends multiple entries to same daily file", () => {
    logEvent({ ts: new Date().toISOString(), source: "A", event: "e1", details: {} }, TEST_LOG_DIR);
    logEvent({ ts: new Date().toISOString(), source: "B", event: "e2", details: {} }, TEST_LOG_DIR);

    const lines = readLogLines(TEST_LOG_DIR);
    expect(lines).toHaveLength(2);
    expect(lines[0].source).toBe("A");
    expect(lines[1].source).toBe("B");
  });

  it("never throws even with invalid path", () => {
    // Pass a path that can't be created (nested under a file)
    expect(() => {
      logEvent(
        { ts: new Date().toISOString(), source: "X", event: "e", details: {} },
        "/dev/null/impossible/path",
      );
    }).not.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd pai-hooks && bun test core/hook-logger.test.ts`
Expected: FAIL with "Cannot find module" — `hook-logger.ts` doesn't exist yet.

**Step 3: Write minimal implementation**

```typescript
// pai-hooks/core/hook-logger.ts
/**
 * HookLogger — Reusable per-hook execution logging.
 *
 * Appends one JSONL line per call to a daily log file.
 * Fire-and-forget: never blocks hook execution, never throws.
 *
 * Log location: ~/.claude/MEMORY/LOGS/hooks/YYYY-MM-DD.jsonl
 */

import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME ?? "/tmp";
const DEFAULT_LOG_DIR = join(HOME, ".claude/MEMORY/LOGS/hooks");

export interface HookLogEntry {
  ts: string;
  source: string;
  event: string;
  details: Record<string, unknown>;
}

function todayFile(logDir: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return join(logDir, `${date}.jsonl`);
}

/**
 * Log a hook event. Fire-and-forget, never throws.
 * @param entry - The log entry to write
 * @param logDir - Override log directory (for testing). Defaults to MEMORY/LOGS/hooks/
 */
export function logEvent(entry: HookLogEntry, logDir: string = DEFAULT_LOG_DIR): void {
  try {
    mkdirSync(logDir, { recursive: true });
    appendFileSync(todayFile(logDir), JSON.stringify(entry) + "\n");
  } catch {
    // Silent failure — logging must never break hooks
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd pai-hooks && bun test core/hook-logger.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add pai-hooks/core/hook-logger.ts pai-hooks/core/hook-logger.test.ts
git commit -m "feat(hooks): add reusable hook logger module

JSONL logging to MEMORY/LOGS/hooks/ for per-hook diagnostics.
Fire-and-forget, never throws, never blocks hook execution."
```

---

## Task 2: Add `caller` to Inference.ts and integrate logging

**Files:**
- Modify: `PAI/Tools/Inference.ts` (lines 36-41 InferenceOptions, line 99 inference function)

**Context:** `InferenceOptions` is at line 36. The `inference()` function resolves at lines 148-194 (inside the `proc.on('close')` and `proc.on('error')` handlers). The `logEvent` import comes from `pai-hooks/core/hook-logger.ts`. Since `Inference.ts` lives in `PAI/Tools/` and hook-logger lives in `pai-hooks/core/`, use a relative import: `../../pai-hooks/core/hook-logger`.

**Step 1: Add `caller` to `InferenceOptions`**

In `PAI/Tools/Inference.ts`, add `caller?: string` to the `InferenceOptions` interface (line 41, after `timeout`):

```typescript
export interface InferenceOptions {
  systemPrompt: string;
  userPrompt: string;
  level?: InferenceLevel;
  expectJson?: boolean;
  timeout?: number;
  caller?: string;  // Hook or tool name for logging attribution
}
```

**Step 2: Add logging to the `inference()` function**

Add import at top of file (after line 1 shebang, before the JSDoc block — or after existing imports near line 79):

```typescript
import { logEvent } from "../../pai-hooks/core/hook-logger";
```

In the `inference()` function, add logging after the promise resolves. Wrap the existing resolve calls in a helper. The cleanest approach: add a `logAndResolve` wrapper inside the function body (after `return new Promise((resolve) => {` at line 108):

```typescript
    const logAndResolve = (result: InferenceResult) => {
      logEvent({
        ts: new Date().toISOString(),
        source: "Inference",
        event: "inference_call",
        details: {
          caller: options.caller ?? "unknown",
          model: config.model,
          level,
          cwd: process.cwd(),
          promptChars: options.systemPrompt.length + options.userPrompt.length,
          outputChars: result.output.length,
          latencyMs: result.latencyMs,
          success: result.success,
          ...(result.error ? { error: result.error } : {}),
        },
      });
      resolve(result);
    };
```

Then replace all `resolve({...})` calls inside the function with `logAndResolve({...})`. There are 5 resolve calls:
- Line 148 (timeout handler)
- Line 162 (non-zero exit)
- Line 183 (no JSON found)
- Line 181 (JSON parse success) — actually `resolve({ success: true, output, parsed, latencyMs, level })`
- Line 193 (text success)
- Line 201 (spawn error)

Change each `resolve(` to `logAndResolve(`.

**Step 3: Run existing tests (if any) to verify nothing breaks**

Run: `cd pai-hooks && bun test` (full suite)
Expected: All existing tests pass. No test file exists for Inference.ts currently.

**Step 4: Manual smoke test**

Run: `cd /Users/hogers/.claude && unset CLAUDECODE && echo "Say OK" | bun PAI/Tools/Inference.ts --level fast "Reply with just OK"`
Then check: `cat MEMORY/LOGS/hooks/$(date +%Y-%m-%d).jsonl | tail -1 | python3 -m json.tool`
Expected: A JSONL entry with `source: "Inference"`, `caller: "unknown"`, `model: "haiku"`.

**Step 5: Commit**

```bash
git add PAI/Tools/Inference.ts
git commit -m "feat(inference): add per-call logging with caller attribution

Every inference() call now logs to MEMORY/LOGS/hooks/ via hook-logger.
Captures: caller, model, level, cwd, prompt/output size, latency, success."
```

---

## Task 3: Update RatingCapture to pass `caller`

**Files:**
- Modify: `hooks/contracts/RatingCapture.ts` (line ~328 where `inference()` is called)

**Step 1: Find the inference call**

The call is at line 328: `deps.inference({ systemPrompt, userPrompt, expectJson: true, ... })`. Add `caller: "RatingCapture"` to the options object.

**Step 2: Make the change**

```typescript
// Before:
() => deps.inference({
  systemPrompt,
  userPrompt,
  expectJson: true,
  level: "fast",
})

// After:
() => deps.inference({
  systemPrompt,
  userPrompt,
  expectJson: true,
  level: "fast",
  caller: "RatingCapture",
})
```

**Step 3: Run tests**

Run: `cd pai-hooks && bun test contracts/RatingCapture.test.ts`
Expected: All pass (the `caller` field is optional, so existing mock deps don't need updating).

**Step 4: Commit**

```bash
git add hooks/contracts/RatingCapture.ts
git commit -m "feat(RatingCapture): pass caller name to inference for logging"
```

---

## Task 4: Update SessionAutoName to pass `caller`

**Files:**
- Modify: `hooks/contracts/SessionAutoName.ts` (line ~256)

**Step 1: Make the change**

```typescript
// Before:
const inferenceResult = await deps.inference({
  systemPrompt: NAME_PROMPT,
  userPrompt: prompt.slice(0, 800),
  level: "fast",
});

// After:
const inferenceResult = await deps.inference({
  systemPrompt: NAME_PROMPT,
  userPrompt: prompt.slice(0, 800),
  level: "fast",
  caller: "SessionAutoName",
});
```

**Step 2: Run tests**

Run: `cd pai-hooks && bun test contracts/SessionAutoName.test.ts`
Expected: All pass.

**Step 3: Commit**

```bash
git add hooks/contracts/SessionAutoName.ts
git commit -m "feat(SessionAutoName): pass caller name to inference for logging"
```

---

## Task 5: Update learning-agent-runner to log its claude -p calls

**Files:**
- Modify: `hooks/learning-agent-runner.ts`

**Context:** This file uses `spawnSync("claude", ["-p", ...])` directly, not `Inference.ts`. It needs its own `logEvent` call.

**Step 1: Add logging**

```typescript
// Add import at top:
import { logEvent } from "../pai-hooks/core/hook-logger";

// In the run() function, wrap the spawnSync:
export function run(baseDir: string, cmd: string = "claude"): void {
  const proposalsDir = join(baseDir, "MEMORY/LEARNING/PROPOSALS");
  const lockPath = join(proposalsDir, ".analyzing");
  const cooldownPath = join(proposalsDir, ".last-analysis");

  const prompt = buildAgentPrompt(baseDir);
  const startTime = Date.now();

  try {
    spawnSync(cmd, ["-p", prompt, "--max-turns", "10"], {
      stdio: "ignore",
      timeout: 10 * 60 * 1000,
      env: { ...process.env, CLAUDECODE: undefined },
    });

    logEvent({
      ts: new Date().toISOString(),
      source: "LearningAgent",
      event: "claude_spawn",
      details: {
        caller: "learning-agent-runner",
        cwd: process.cwd(),
        promptChars: prompt.length,
        maxTurns: 10,
        latencyMs: Date.now() - startTime,
        success: true,
      },
    });
  } finally {
    try { writeFileSync(cooldownPath, new Date().toISOString()); } catch {}
    try { unlinkSync(lockPath); } catch {}
  }
}
```

**Step 2: Run tests**

Run: `cd pai-hooks && bun test contracts/LearningActioner.test.ts`
Expected: All pass (the runner is tested through LearningActioner, and logEvent is fire-and-forget so it won't affect existing behavior).

**Step 3: Commit**

```bash
git add hooks/learning-agent-runner.ts
git commit -m "feat(LearningAgent): add logging to claude -p spawn calls"
```

---

## Task 6: CLI Report Tool

**Files:**
- Create: `PAI/Tools/HookReport.ts`

**Step 1: Write the report tool**

```typescript
#!/usr/bin/env bun
/**
 * HookReport — CLI tool to analyze hook logging data.
 *
 * Usage:
 *   bun HookReport.ts                    # today
 *   bun HookReport.ts --date 2026-03-09  # specific day
 *   bun HookReport.ts --range 7          # last 7 days
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME ?? "/tmp";
const LOG_DIR = join(HOME, ".claude/MEMORY/LOGS/hooks");

interface LogEntry {
  ts: string;
  source: string;
  event: string;
  details: Record<string, unknown>;
}

interface SourceStats {
  calls: number;
  totalLatency: number;
  totalPromptChars: number;
  totalOutputChars: number;
  successes: number;
  failures: number;
}

function parseArgs(): { dates: string[] } {
  const args = process.argv.slice(2);
  const dates: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--date" && args[i + 1]) {
      dates.push(args[i + 1]);
      i++;
    } else if (args[i] === "--range" && args[i + 1]) {
      const days = parseInt(args[i + 1], 10);
      for (let d = 0; d < days; d++) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        dates.push(date.toISOString().slice(0, 10));
      }
      i++;
    }
  }

  if (dates.length === 0) {
    dates.push(new Date().toISOString().slice(0, 10));
  }

  return { dates };
}

function readEntries(dates: string[]): LogEntry[] {
  const entries: LogEntry[] = [];
  for (const date of dates) {
    const file = join(LOG_DIR, `${date}.jsonl`);
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, "utf-8").trim().split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch {}
    }
  }
  return entries;
}

function printReport(dates: string[], entries: LogEntry[]): void {
  const dateRange = dates.length === 1
    ? dates[0]
    : `${dates[dates.length - 1]} to ${dates[0]}`;

  console.log(`\nHook Report — ${dateRange}`);
  console.log("═".repeat(78));

  if (entries.length === 0) {
    console.log("\nNo log entries found. Hooks may not have logging enabled yet.");
    console.log(`Log directory: ${LOG_DIR}`);
    return;
  }

  // Group by source + caller
  const bySource = new Map<string, SourceStats>();

  for (const entry of entries) {
    const caller = (entry.details.caller as string) ?? entry.source;
    const key = caller;

    if (!bySource.has(key)) {
      bySource.set(key, {
        calls: 0,
        totalLatency: 0,
        totalPromptChars: 0,
        totalOutputChars: 0,
        successes: 0,
        failures: 0,
      });
    }

    const stats = bySource.get(key)!;
    stats.calls++;
    stats.totalLatency += (entry.details.latencyMs as number) ?? 0;
    stats.totalPromptChars += (entry.details.promptChars as number) ?? 0;
    stats.totalOutputChars += (entry.details.outputChars as number) ?? 0;
    if (entry.details.success) stats.successes++;
    else stats.failures++;
  }

  // Print table
  const header = "Source".padEnd(24) +
    "Calls".padStart(7) +
    "Avg Lat".padStart(10) +
    "Prompt".padStart(12) +
    "Output".padStart(12) +
    "Est Tokens".padStart(12);

  console.log(`\n${header}`);
  console.log("─".repeat(78));

  let totalCalls = 0;
  let totalPrompt = 0;
  let totalOutput = 0;

  const sorted = [...bySource.entries()].sort((a, b) => b[1].calls - a[1].calls);

  for (const [source, stats] of sorted) {
    const avgLatency = stats.calls > 0 ? (stats.totalLatency / stats.calls / 1000).toFixed(1) + "s" : "-";
    const estTokens = Math.round((stats.totalPromptChars + stats.totalOutputChars) / 4);

    console.log(
      source.padEnd(24) +
      String(stats.calls).padStart(7) +
      avgLatency.padStart(10) +
      stats.totalPromptChars.toLocaleString().padStart(12) +
      stats.totalOutputChars.toLocaleString().padStart(12) +
      `~${estTokens.toLocaleString()}`.padStart(12)
    );

    totalCalls += stats.calls;
    totalPrompt += stats.totalPromptChars;
    totalOutput += stats.totalOutputChars;
  }

  console.log("─".repeat(78));
  const totalTokens = Math.round((totalPrompt + totalOutput) / 4);
  console.log(
    "TOTAL".padEnd(24) +
    String(totalCalls).padStart(7) +
    "".padStart(10) +
    totalPrompt.toLocaleString().padStart(12) +
    totalOutput.toLocaleString().padStart(12) +
    `~${totalTokens.toLocaleString()}`.padStart(12)
  );

  console.log(`\nEstimated token cost from hook calls: ~${totalTokens.toLocaleString()}`);
}

// Main
const { dates } = parseArgs();
const entries = readEntries(dates);
printReport(dates, entries);
```

**Step 2: Smoke test (will show empty until hooks generate data)**

Run: `bun PAI/Tools/HookReport.ts`
Expected: "No log entries found" message (no data yet).

**Step 3: Commit**

```bash
git add PAI/Tools/HookReport.ts
git commit -m "feat: add HookReport CLI tool for hook logging analysis

Reads MEMORY/LOGS/hooks/ JSONL, groups by caller, shows call counts,
latency, prompt/output sizes, and estimated token costs."
```

---

## Task 7: Verify end-to-end

**Step 1: Trigger a hook that uses inference**

Start a new Claude Code session in the .claude directory. The SessionAutoName and RatingCapture hooks should fire and log.

**Step 2: Check logs**

Run: `cat MEMORY/LOGS/hooks/$(date +%Y-%m-%d).jsonl | python3 -m json.tool`
Expected: JSONL entries with `source: "Inference"`, appropriate `caller` values.

**Step 3: Run the report**

Run: `bun PAI/Tools/HookReport.ts`
Expected: Table showing the calls with caller, latency, and size data.

**Step 4: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore: verify hook logging end-to-end"
```

---

## Summary

| Task | What | Files | Est. Time |
|------|------|-------|-----------|
| 1 | Generic hook logger module + tests | `pai-hooks/core/hook-logger.ts`, `.test.ts` | 3 min |
| 2 | Inference.ts caller + logging integration | `PAI/Tools/Inference.ts` | 5 min |
| 3 | RatingCapture caller attribution | `hooks/contracts/RatingCapture.ts` | 1 min |
| 4 | SessionAutoName caller attribution | `hooks/contracts/SessionAutoName.ts` | 1 min |
| 5 | learning-agent-runner logging | `hooks/learning-agent-runner.ts` | 2 min |
| 6 | CLI report tool | `PAI/Tools/HookReport.ts` | 5 min |
| 7 | End-to-end verification | — | 3 min |

**Total: ~20 minutes**

## Not In Scope (Future)

- Runner-level logging (Layer 3 from design doc)
- Inference session reuse per hook (RatingCapture reusing one session)
- RatingCapture pre-filter to reduce inference calls
- Inference.ts cwd fix for correct project attribution
