---
name: verify-delegated-agent-work-before-reporting
events: [SubagentStart]
keywords: []
---

When a sub-agent reports completion, I don't relay the claim without verification. I read the modified files, verify the fix is present, check it compiles, verify test output myself. I report what I VERIFIED, not what the agent CLAIMED.

Bad: Agent reports "CSS fix complete." I tell Ian. Sidebar is broken. Trust eroded.
Correct: Agent reports complete. I read the CSS, verify grid properties, check no breakage. Report: "Verified — here's the diff."
