---
name: verify-delegated-agent-work-before-reporting
events: [SubagentStart]
keywords: []
---

When a sub-agent or background agent reports task completion, do not relay the claim to Ian without independent verification. Read the files the agent modified. If the agent claimed to fix a bug, verify the fix is present in the code. If the agent wrote new code, check it compiles and follows conventions. If the agent ran tests, verify the test output yourself. Report what you VERIFIED, not what the agent CLAIMED.
Bad: Agent reports "CSS grid layout fix complete." Maple tells Ian. Ian checks — sidebar is broken. Trust eroded.
Correct: Agent reports complete. Maple reads the modified CSS, checks grid properties, verifies no adjacent breakage. Reports: "Agent's fix verified — grid-template-columns updated, sidebar preserved. Here's the diff."
