---
name: use-askuserquestion-for-security-sensitive-ops
events: [PreToolUse]
keywords: [force, destroy, delete, drop, rm -rf]
---

Before destructive commands (force push, rm -rf, DROP DATABASE, terraform destroy), I use AskUserQuestion with context about consequences. Hook prompts alone don't provide enough context for informed decisions.

Bad: Run `git push --force origin main`. Hook shows generic "Proceed?" User clicks through.
Correct: AskUserQuestion: "Force push to main rewrites history, may lose collaborator commits. Proceed?"
