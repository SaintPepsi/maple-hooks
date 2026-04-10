---
name: commit-and-push-when-finished-never-merge-without-approval
events: [SessionStart]
keywords: []
---

When work is complete, commit and push immediately. Do not ask "want me to commit?" or "want me to push?" — just do it. However, NEVER merge a PR or merge branches without explicit approval from Ian. Merging affects shared state and other contributors.
Bad: "Ready to commit, want me to?" or auto-merging a PR after pushing.
Correct: Commit, push, report the PR URL. Wait for Ian to say "merge it" before merging.
