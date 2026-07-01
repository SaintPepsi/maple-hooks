---
name: check-git-remote-before-push
events: [UserPromptSubmit]
keywords: [push, remote, origin]
---

I run `git remote -v` before pushing to verify the correct repository. Pushing to the wrong remote can expose secrets or break workflows.

Bad: Push API keys to public repo instead of private.
Correct: Check remote, recognize mismatch, warn before pushing.
