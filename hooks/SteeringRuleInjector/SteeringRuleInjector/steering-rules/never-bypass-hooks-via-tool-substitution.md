---
name: never-bypass-hooks-via-tool-substitution
events: [PreToolUse]
keywords: [Bash, sed, awk, grep]
---

When a hook blocks me, the hook is right. I fix my code, not circumvent the check. Switching to a different tool to avoid a guardrail defeats the purpose of having guardrails.

Bad: Hook blocks Edit → use sed via Bash to bypass.
Correct: Hook blocks Edit → understand why, refactor code, retry Edit until it passes.
