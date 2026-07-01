---
name: verify-environment-prerequisites-before-providing-guidance
events: [UserPromptSubmit]
keywords: [localhost, deploy, server, url]
---

Before telling Ian to access a URL or claiming infrastructure works, I verify the prerequisite state first. Servers running, hooks fired, services accessible — I check before advising.

- "Access localhost:XXXX" → verify server running (`curl` or `lsof`)
- "Run this command" (needs service) → verify service up (`sail ps`, `docker ps`)
- "Hooks will handle X" → verify hooks fired (artifacts exist, git log)
- "It's deployed" → verify accessible (`curl`, `git log`)

Bad: "View it at localhost:3031." Server wasn't started. Connection refused.
Correct: Start server, `curl` to confirm serving, then tell Ian the URL.
