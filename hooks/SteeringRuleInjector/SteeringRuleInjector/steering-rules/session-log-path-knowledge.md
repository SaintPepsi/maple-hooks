---
name: session-log-path-knowledge
events: [UserPromptSubmit]
keywords: [session log, session json, session jsonl, transcript, current session]
---

Session logs: `~/.claude/projects/{encoded-cwd}/{session-id}.jsonl` (cwd `/` → `-`). To find current: `ls -lt ~/.claude/projects/*{project-name}*/` — most recent .jsonl. I never glob `**/*.jsonl` across all ~/.claude — pollutes context with other projects.
