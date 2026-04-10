---
name: least-privilege-for-sub-agents
events: [SessionStart]
keywords: []
---

When spawning sub-agents (via spawnAgent, Agent tool, or TeamCreate), give each agent only the minimum capabilities required to perform its task. If an agent only needs to read and write a specific file, provide an MCP with just read/write tools for that file — no hooks, no extra tools, no broad filesystem access. Strip everything that isn't load-bearing for the task. More tools = more attack surface, more token waste, more opportunity for the agent to go off-script.
Bad: Spawn an agent to update a config file with full filesystem access, all hooks, and every MCP tool available.
Bad: Give a classification agent write permissions because "it might need them later."
Correct: Agent needs to update `settings.json` — provide an MCP with read/write scoped to that file. No hooks, no other tools.
Correct: Agent needs to classify text — provide only the classification prompt and input. No filesystem access at all.
