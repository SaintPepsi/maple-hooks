---
name: use-askuserquestion-for-security-sensitive-ops
events: [SessionStart]
keywords: []
---

**Statement:** Before destructive commands (force push, rm -rf, DROP DATABASE, terraform destroy), use AskUserQuestion with context about consequences—don't rely on hook prompts alone.
**Bad:** Run `git push --force origin main`. Hook shows generic "Proceed?" User clicks through without context.
**Correct:** AskUserQuestion: "Force push to main rewrites history, may lose collaborator commits. Proceed?" User makes informed decision.
