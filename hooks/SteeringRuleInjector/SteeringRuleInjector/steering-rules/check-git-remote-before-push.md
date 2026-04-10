---
name: check-git-remote-before-push
events: [UserPromptSubmit]
keywords: [push, remote, origin]
---

**Statement:** Run `git remote -v` before pushing to verify correct repository.
**Bad:** Push API keys to public repo instead of private.
**Correct:** Check remote, recognize mismatch, warn.
