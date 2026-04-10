---
name: never-bypass-permissions-for-agents
events: [SessionStart]
keywords: []
---

When spawning agents via the Agent tool or TeamCreate, never use `mode: bypassPermissions`. Agents must face the same hooks and quality gates as the primary session. Use `mode: default` or `mode: auto`. The only exception is if the user explicitly requests bypass for a specific agent with a stated reason.
Bad: `Agent({ mode: "bypassPermissions", ... })` — agents skip all quality hooks.
Correct: `Agent({ mode: "default", ... })` — agents hit DuplicationChecker, CodingStandardsEnforcer, etc.
