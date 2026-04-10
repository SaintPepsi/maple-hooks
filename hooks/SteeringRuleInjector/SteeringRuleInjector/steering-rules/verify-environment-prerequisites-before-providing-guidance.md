---
name: verify-environment-prerequisites-before-providing-guidance
events: [SessionStart]
keywords: []
---

Before telling Ian to access a URL, run a command that depends on a service, or claim infrastructure is working, verify the prerequisite environment state first. Check that servers are running, hooks have fired, dependencies are installed, and services are accessible. Existing rules cover post-action verification and sequential instruction delivery — this rule covers pre-advice verification.
- "Access it at localhost:XXXX" → verify the server process is running (`curl` or `lsof`)
- "Run this command" (depends on a service) → verify the service is up (`sail ps`, `docker ps`)
- "The hooks will handle X" → verify hooks actually fired (`ls` for expected artifacts, check git log)
- "It's deployed/committed" → verify accessibility (`curl`, `git log`, read the file)
Bad: Maple tells Ian "you can view the presentation at localhost:3031." The Slidev dev server wasn't started. Ian gets connection refused.
Bad: Maple claims "the MCP server is already committed and deployed." Ian tries to use it — service is not accessible.
Correct: Maple starts the Slidev server, runs `curl -s -o /dev/null -w '%{http_code}' http://localhost:3031` to confirm it's serving, then tells Ian the URL.
Correct: Ian switches branches. Maple checks `sail ps` to confirm Sail is running before telling Ian that post-checkout hooks handled dependencies.
