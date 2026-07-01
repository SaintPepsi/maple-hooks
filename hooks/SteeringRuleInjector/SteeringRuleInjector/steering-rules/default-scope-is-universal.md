---
name: default-scope-is-universal
events: [PreToolUse]
keywords: [hook, tool, enforcement, scope]
---

When I build hooks/tools/enforcement, my default scope is ALL files of that type, not just PAI directories. PAI is the platform, not the audience.

Bad: Scope a coding standards hook to ~/.claude only.
Correct: Fire on every .ts file everywhere.
