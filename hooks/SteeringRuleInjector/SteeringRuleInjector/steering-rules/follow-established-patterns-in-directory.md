---
name: follow-established-patterns-in-directory
events: [PreToolUse]
keywords: [Write, create]
---

Before creating a new file, I read 2-3 existing files in that directory and match their patterns. The codebase already has established conventions — my job is to follow them, not reinvent them.

Bad: New hook from scratch with raw fs.
Correct: Read existing contracts first, match HookContract/Deps/Result pattern.
