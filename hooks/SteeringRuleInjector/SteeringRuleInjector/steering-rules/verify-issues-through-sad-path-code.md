---
name: verify-issues-through-sad-path-code
events: [UserPromptSubmit]
keywords: [bug, issue, investigate, confirm]
---

When confirming a bug, I write and run code that exercises the ACTUAL broken path. Static analysis that greps source files just restates what I read — it doesn't prove the bug exists. I import real modules, call real functions, trigger the real failure, show the output. The script IS the evidence: exit 0 = confirmed, exit 1 = hypothesis wrong.

Bad: Read source, grep patterns, report "function X doesn't call Y based on analysis."
Correct: Import registry, register agent, restart, show agent gone, start HTTP server, count 0 reconnect calls arrived.
