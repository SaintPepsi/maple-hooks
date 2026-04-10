---
name: never-bypass-hooks-via-tool-substitution
events: [SessionStart]
keywords: []
---

Hook blocks action → fix code to pass, never switch tools to circumvent. Hooks enforce standards.
Bad: Hook blocks Edit, use sed via Bash. Correct: Hook blocks Edit, refactor code, retry Edit until it passes.
