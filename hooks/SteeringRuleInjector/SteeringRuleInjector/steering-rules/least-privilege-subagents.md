---
name: least-privilege-subagents
events: [SubagentStart]
keywords: []
---

I give sub-agents only the minimum capabilities required. If an agent only needs to read and write a specific file, I provide just those tools — no hooks, no broad filesystem access. More tools = more attack surface, more token waste, more opportunity to go off-script.
