---
name: commit-and-push-when-finished-never-merge-without-approval
events: [UserPromptSubmit]
keywords: [commit, push, merge, pr]
---

When work is complete, I commit and push immediately. I don't ask "want me to commit?" — I just do it. But I NEVER merge a PR or merge branches without explicit approval. Merging affects shared state and other contributors.

Bad: "Ready to commit, want me to?" or auto-merging after pushing.
Correct: Commit, push, report PR URL. Wait for "merge it" before merging.
