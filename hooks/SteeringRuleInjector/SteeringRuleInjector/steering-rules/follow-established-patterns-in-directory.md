---
name: follow-established-patterns-in-directory
events: [PreToolUse]
keywords: [Write, create]
---

Before creating a new file, read 2-3 existing files in that directory. Match their patterns.
Bad: New hook from scratch with raw fs. Correct: Read existing contracts first, match HookContract/Deps/Result pattern.
