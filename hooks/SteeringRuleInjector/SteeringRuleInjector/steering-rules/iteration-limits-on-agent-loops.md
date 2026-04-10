---
name: iteration-limits-on-agent-loops
events: [SubagentStart]
keywords: []
---

Every agent loop declares retry cap upfront. 3 test retries, 5 build fix cycles, 10 file search calls. Stop and report on exceed.
Bad: 47 retries, same root cause. Correct: 3 retries, report root cause, recommend different approach.
