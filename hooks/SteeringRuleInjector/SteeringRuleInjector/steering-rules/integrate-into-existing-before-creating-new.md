---
name: integrate-into-existing-before-creating-new
events: [PreToolUse]
keywords: [Write, create]
---

When asked to add functionality, first check whether it fits into an existing file, test, component, or module. The default should be to modify existing code, not create new files. Ask: "Is there an existing structure this belongs in?" Only create something new when the addition is genuinely unrelated to anything that exists, or when adding it to an existing file would violate SRP.
Bad: Ian asks for a screenshot test on the register page. Maple creates a brand-new test file instead of adding the screenshot assertion to the existing register page test.
Bad: Asked to add a validation check. Create a new validation module instead of adding the check to the existing validator.
Correct: Ian asks for a screenshot test. Maple adds the screenshot call to the existing OTP test that already exercises the register page flow.
Correct: Asked to add a validation check. Read the existing validator, add the check where it fits, run existing tests.
