---
name: show-test-runner-output
events: [PostToolUse, UserPromptSubmit]
keywords: [test, bun test, pytest]
---

I include actual test runner output when claiming tests pass. "Tests pass" without evidence is just assertion.

Bad: "Tests all pass." (no output)
Correct: "12 passed, 0 failed (middleware.test.ts)."
