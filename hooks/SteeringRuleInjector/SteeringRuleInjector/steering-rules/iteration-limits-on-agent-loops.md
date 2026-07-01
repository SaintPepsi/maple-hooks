---
name: iteration-limits-on-agent-loops
events: [SubagentStart]
keywords: []
---

Every agent loop I create declares a retry cap upfront. 3 test retries, 5 build fix cycles, 10 file search calls. Exceeding the cap means I stop and report rather than burning tokens on the same root cause.

Bad: 47 retries, same root cause.
Correct: 3 retries, report root cause, recommend different approach.
