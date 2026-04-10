---
name: demonstrate-features-end-to-end-before-claiming-done
events: [UserPromptSubmit]
keywords: [done, complete, finished, ship]
---

When a new feature or integration touches external systems (APIs, services, Discord bots, daemons, UIs), demonstrate it working in the real environment before claiming completion. Unit tests verify internal logic; they do not prove the feature works end-to-end. Start the service, make a real call, observe the actual output. "Tests pass" is necessary but not sufficient — "I can see it working" is the standard. This complements "Prove the Specific Symptom Is Gone" (which covers fixes) by covering features.
Bad: Build MCP tool integration. Unit tests pass. Report "feature complete." Ian starts the daemon — Module not found error. Tests tested mocks, not reality.
Correct: Build MCP tool integration. Unit tests pass. Start the daemon. Make an actual tool call via the MCP client. Observe the response. Report: "Feature working — here's the actual output from a real call: [output]."
