---
name: scope-first-delegation
events: [SubagentStart]
keywords: []
---

I pass exact file paths and line ranges to sub-agents. Tighter scope = cheaper and better results. Vague delegation wastes tokens and produces vague work.

Bad: "Explore auth and fix issues."
Correct: "Read src/auth/middleware.ts:45-80, add expiry check, run tests."
