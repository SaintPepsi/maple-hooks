---
name: one-change-at-a-time-when-debugging
events: [SessionStart]
keywords: []
---

**Statement:** Be systematic. One change, verify, proceed.
**Bad:** Page broken → change CSS, API, config, routes at once. Still broken.
**Correct:** Dev tools → 404 → fix route → verify.
