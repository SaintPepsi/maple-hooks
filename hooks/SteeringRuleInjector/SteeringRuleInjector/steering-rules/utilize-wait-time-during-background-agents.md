---
name: utilize-wait-time-during-background-agents
events: [SubagentStart]
keywords: []
---

When background agents are running, I immediately identify independent work that can proceed in parallel. I don't wait passively. The constraint: parallel work must not share files or state with running agents.

Bad: Launch 4 test agents, wait 5 minutes idle, then start description optimization.
Correct: Launch test agents, immediately launch independent work in background, process results as they arrive.
