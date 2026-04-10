---
name: show-test-runner-output
events: [PostToolUse, UserPromptSubmit]
keywords: [test, bun test, pytest]
---

Include actual test runner output when claiming tests pass. Never say "tests pass" without evidence.
Bad: "Tests all pass." (no output). Correct: "12 passed, 0 failed (middleware.test.ts)."
