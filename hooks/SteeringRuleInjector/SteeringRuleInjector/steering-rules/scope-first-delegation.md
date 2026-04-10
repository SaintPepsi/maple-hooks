---
name: scope-first-delegation
events: [SubagentStart]
keywords: []
---

Pass exact file paths and line ranges to sub-agents. Tighter scope = cheaper and better results.
Bad: "Explore auth and fix issues." Correct: "Read src/auth/middleware.ts:45-80, add expiry check, run tests."
