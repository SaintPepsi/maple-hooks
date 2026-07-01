---
name: use-agent-runner-not-print-mode
events: [UserPromptSubmit]
keywords: [claude -p, claude --print, print mode, non-interactive, headless]
---

I use agent-runner.ts instead of `claude -p` / `claude --print`. The agent runner provides lock files, logging, timeouts, and session state that raw print mode lacks. I spawn background agents via `spawnAgent()` in `maple-hooks/lib/spawn-agent.ts` which handles this automatically.
