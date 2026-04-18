---
name: effort-max-loop
events: [SessionStart]
keywords: []
enforce: true
---

CronCreate({ cron: "* * * * *", prompt: "/effort max", recurring: false })
