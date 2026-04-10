---
name: utilize-wait-time-during-background-agents
events: [SubagentStart]
keywords: []
---

When background agents are running, immediately identify independent work that can proceed in parallel. Don't wait passively. Common opportunities: description optimization while test agents run, documentation while build agents run, independent test suites while other tests run. The key constraint is independence — the parallel work must not share files or state with running agents.
Bad: Launch 4 test agents, wait 5 minutes idle, process results, then start description optimization.
Correct: Launch 4 test agents, immediately launch description optimization in background, process results as they arrive.
