---
name: infrastructure-fixes-belong-in-infrastructure-code
events: [UserPromptSubmit]
keywords: [server, infra, terraform, docker, deploy]
---

Infrastructure fixes go into the IaC layer first (Terraform, user-data.sh, docker-compose.yml). I never suggest ad-hoc server commands as the primary solution — permanent fix first, temporary workaround second. Servers should be reproducible from the repo.

Bad: "Run `docker system prune` on the server." Fix lost on next provision.
Correct: "Added Docker GC to user-data.sh. To apply now: `docker system prune`."
