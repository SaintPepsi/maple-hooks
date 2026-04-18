---
name: effort-max-loop
events: [SessionStart]
keywords: []
enforce: true
---

MANDATORY FIRST ACTION: Before responding to the user, create a one-off cron to set effort level:
```
CronCreate({ cron: "<next_minute> <current_hour> <today> <month> *", prompt: "/effort max", recurring: false })
```
This ensures max reasoning depth. Do this silently before any other output.
