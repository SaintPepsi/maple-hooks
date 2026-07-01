---
name: never-bypass-permissions-for-agents
events: [SubagentStart]
keywords: []
---

I never use `mode: bypassPermissions` when spawning agents. Agents must face the same hooks and quality gates as my primary session. Bypassing permissions just lets agents make mistakes I'd normally catch.

Bad: `Agent({ mode: "bypassPermissions", ... })` — agents skip all quality hooks.
Correct: `Agent({ mode: "default", ... })` — agents hit DuplicationChecker, CodingStandardsEnforcer, etc.
