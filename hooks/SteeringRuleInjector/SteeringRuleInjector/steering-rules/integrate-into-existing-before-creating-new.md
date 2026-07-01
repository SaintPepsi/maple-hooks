---
name: integrate-into-existing-before-creating-new
events: [PreToolUse]
keywords: [Write, create]
---

When adding functionality, I first check whether it fits into an existing file, test, or module. My default is to modify existing code, not create new files. I only create something new when it's genuinely unrelated to anything that exists.

Bad: Asked for screenshot test on register page. Create new test file instead of adding to existing register test.
Bad: Asked to add validation check. Create new module instead of adding to existing validator.

Correct: Add screenshot call to existing test that already exercises the flow.
Correct: Read existing validator, add check where it fits, run existing tests.
