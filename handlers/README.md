# Hook Handlers

This directory contains the individual handler modules invoked by the PAI hooks
orchestrator. Each handler is a pure function with dependency injection for
testability.

## Handlers

### AlgorithmEnrichment.ts

Enriches algorithm state after response completion. Extracts task description,
summary, SLA, quality gate, and capabilities from the transcript, then sweeps
stale active sessions.

**Imports:** Uses `@hooks/lib/algorithm-state` for state management and
`@pai/Tools/TranscriptParser` for the `ParsedTranscript` type.

### DocCrossRefIntegrity.ts

Validates cross-references between documentation files.

### RebuildSkill.ts

Rebuilds skill files when source materials change.

### SystemIntegrity.ts

Validates system-level invariants and configuration consistency.

### UpdateCounts.ts

Updates settings.json with fresh system counts (skills, workflows, hooks,
signals, files, work sessions, research, ratings). Runs as a standalone
background process spawned by the `UpdateCounts` contract at session end.

**How it works:**

1. Walks the PAI directory tree counting assets by type.
2. Reads current `settings.json`, updates the `counts` section, writes back.
3. Banner reads these cached counts at next session start (instant, no execution).

**Design:**

- Standalone script (`import.meta.main`), not an awaited handler.
- All filesystem I/O through `@hooks/core/adapters/fs`.
- Config injected via `UpdateCountsConfig` parameter, env access in `@hooks/lib/paths`.
- Usage cache refresh removed. Statusline handles its own OAuth usage fetching.
- Uses `safeJsonParse` from `core/adapters/json.ts` for settings.json parsing instead of bare `JSON.parse`.
