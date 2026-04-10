---
name: least-privilege-subagents
events: [SessionStart]
keywords: []
---

Least Privilege for Sub-Agents. When spawning sub-agents (via spawnAgent, Agent tool, or TeamCreate), give each agent only the minimum capabilities required to perform its task. If an agent only needs to read and write a specific file, provide an MCP with just read/write tools for that file — no hooks, no extra tools, no broad filesystem access. Strip everything that isn't load-bearing for the task. More tools = more attack surface, more token waste, more opportunity for the agent to go off-script.
