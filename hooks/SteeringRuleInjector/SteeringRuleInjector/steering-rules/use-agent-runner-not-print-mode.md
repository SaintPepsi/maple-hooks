---
name: use-agent-runner-not-print-mode
events: [UserPromptSubmit]
keywords: [claude -p, claude --print, print mode, non-interactive, headless]
---

Use agent-runner.ts instead of `claude -p` / `claude --print`. The agent runner at `pai-hooks/runners/agent-runner.ts` provides lock files, traceability logging, timeout enforcement, and session state management that raw print mode does not. Spawn background agents via the shared `spawnAgent()` function in `pai-hooks/lib/spawn-agent.ts` which handles all of this automatically.
