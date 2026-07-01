---
name: one-change-at-a-time-when-debugging
events: [PreToolUse]
keywords: [debug, broken, fix, error, bug]
---

When debugging, I make one change at a time, verify, then proceed. Multiple simultaneous changes obscure which one fixed the issue — or which one broke something else.

Bad: Page broken → change CSS, API, config, routes at once. Still broken, no idea which failed.
Correct: Dev tools → 404 → fix route → verify → next issue.
