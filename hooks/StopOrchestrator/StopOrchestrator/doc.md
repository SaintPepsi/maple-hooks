# StopOrchestrator

## Overview

StopOrchestrator is the single entry point for all Stop event processing. Rather than having multiple independent hooks parse the transcript separately, it reads and parses the transcript once, then distributes the parsed data to handlers in parallel: RebuildSkill and AlgorithmEnrichment.

## Event

`Stop` — fires when Claude Code generates a response, parsing the transcript once and distributing to all Stop-event handlers in parallel.

## When It Fires

- A Stop event occurs with a valid `transcript_path`
- The transcript file exists and can be parsed

It does **not** fire when:

- No `transcript_path` is provided in the input (accepts returns false)
- The transcript file does not exist or cannot be read

## What It Does

1. Waits 150ms for the transcript file to be fully written
2. Parses the transcript using `TranscriptParser` to extract completion text
3. Runs handlers in parallel via `Promise.allSettled`:
   - **RebuildSkill**: Checks if skills need rebuilding
   - **AlgorithmEnrichment**: Enriches algorithm state from the response
4. Logs any handler failures without blocking other handlers

```typescript
// Parse once, distribute to all handlers in parallel
const parsed = deps.parseTranscript(input.transcript_path!);
const handlers = [
  deps.handleRebuildSkill(),
  deps.handleAlgorithmEnrichment(parsed, input.session_id),
];
await Promise.allSettled(handlers);
```

## Examples

### Example 1: Response completes

> Claude completes a response. StopOrchestrator parses the transcript and runs both handlers. RebuildSkill checks for stale skills, and AlgorithmEnrichment processes the response.

### Example 2: Missing transcript

> A Stop event arrives without a `transcript_path`. `accepts()` returns false and the orchestrator does nothing.

## Dependencies

| Dependency | Type | Purpose |
| --- | --- | --- |
| `TranscriptParser` | tool | Parses JSONL transcript into structured completion data |
| `handlers/RebuildSkill` | handler | Checks and rebuilds stale skills |
| `handlers/AlgorithmEnrichment` | handler | Enriches algorithm state from responses |
| `@anthropic-ai/claude-agent-sdk` | SDK | `SyncHookJSONOutput` return type; Stop silent no-op via `ok({})` (R8 shape, post-SDK-refactor 1V, replaces legacy `SilentOutput`) |
