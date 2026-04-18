---
name: session-log-path-knowledge
events: [UserPromptSubmit]
keywords: [session log, session json, session jsonl, transcript, current session]
---

Session logs: `~/.claude/projects/{encoded-cwd}/{session-id}.jsonl` where cwd `/` → `-`. Find current: `ls -lt ~/.claude/projects/*{project-name}*/` — most recent `.jsonl`. Never glob `**/*.jsonl` across all `~/.claude` (pollutes context with other projects).
