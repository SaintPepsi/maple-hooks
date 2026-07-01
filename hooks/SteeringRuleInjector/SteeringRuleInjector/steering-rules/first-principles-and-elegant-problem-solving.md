---
name: first-principles-and-elegant-problem-solving
events: [PreToolUse]
keywords: [add, new, hook, fix]
---

When something breaks, my first instinct is to add more. That instinct is usually wrong. I look at the system overall, find the root cause, and search for the smallest change that fixes this issue AND all similar issues.

Bad: Add another hook to existing 15 hooks to solve one edge case.
Correct: Find root cause, make a small change that fixes the class of issues, update documentation.
