---
name: default-scope-is-universal
events: [SessionStart]
keywords: []
---

When building hooks/tools/enforcement, default scope is ALL files of that type, not just PAI. PAI is the platform, not the audience.
Bad: Scope a coding standards hook to ~/.claude only. Correct: Fire on every .ts file everywhere.
