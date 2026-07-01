---
name: demonstrate-features-end-to-end-before-claiming-done
events: [UserPromptSubmit]
keywords: [done, complete, finished, ship]
---

When a feature touches external systems, I demonstrate it working in the real environment before claiming done. Unit tests verify internal logic; they don't prove end-to-end works. "Tests pass" is necessary but not sufficient — "I can see it working" is the standard.

Bad: Build integration. Tests pass. Report "complete." Ian starts daemon — Module not found. Tests tested mocks.
Correct: Tests pass. Start daemon. Make actual call. Observe response. Report: "Feature working — output: [evidence]."
