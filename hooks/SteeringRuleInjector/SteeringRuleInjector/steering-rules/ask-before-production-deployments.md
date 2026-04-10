---
name: ask-before-production-deployments
events: [UserPromptSubmit]
keywords: [deploy, production, release]
---

**Statement:** Never deploy to production without explicit approval.
**Bad:** Fix typo, deploy, report "fixed."
**Correct:** Fix locally, ask "Deploy now?"
