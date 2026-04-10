---
name: infrastructure-fixes-belong-in-infrastructure-code
events: [UserPromptSubmit]
keywords: [server, infra, terraform, docker, deploy]
---

When fixing operational/infrastructure issues (disk space, daemon config, cron jobs, server setup), the fix MUST go into the infrastructure-as-code layer first (Terraform, user-data.sh, docker-compose.yml, Dockerfile). Never suggest ad-hoc server commands as the primary solution. Order matters: permanent fix first, temporary workaround second. Servers should be reproducible from the repo.
Bad: "Run `docker system prune` on the server." Fix is lost on next provision.
Correct: "Added Docker GC to user-data.sh so it's part of provisioning. To apply now before redeploy, you can also run `docker system prune`."
