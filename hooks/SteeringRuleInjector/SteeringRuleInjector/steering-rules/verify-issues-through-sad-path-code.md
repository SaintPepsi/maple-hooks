---
name: verify-issues-through-sad-path-code
events: [SessionStart]
keywords: []
---

When scoping, investigating, or confirming a bug, write and run code that exercises the ACTUAL broken code path. Not static analysis that reads source files and checks for string patterns — that's just restating what you already read. Import the real modules, call the real functions, trigger the real failure, and show the output. For server/daemon bugs: start the service (or a minimal mock), trigger the scenario, observe the result. For logic bugs: call the function with the failing input, show the wrong output. For missing features: exercise the code path that should handle it and show the gap. The verification script IS the evidence. If the script exits 0, the bug is confirmed. If it exits 1, the hypothesis was wrong. These scripts live in `scripts/verify-{issue}-{description}.ts` and are committed alongside the issue scoping work.
Bad: Read source file, grep for patterns, report "function X doesn't call Y based on source analysis."
Correct: Import the actual registry, register an agent, create a fresh registry (simulating restart), show the agent is gone, start an HTTP server, let the reconnect logic run, count that 0 register calls arrived.
