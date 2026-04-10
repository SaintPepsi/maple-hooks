---
name: never-bypass-hooks-via-tool-substitution
events: [PreToolUse]
keywords: [Bash, sed, awk, grep]
---

Hook blocks action → fix code to pass, never switch tools to circumvent. Hooks enforce standards.
Bad: Hook blocks Edit, use sed via Bash. Correct: Hook blocks Edit, refactor code, retry Edit until it passes.
