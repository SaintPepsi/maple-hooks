---
name: session-hygiene
events: [SessionStart]
keywords: []
---

Compact at 60k tokens. Fresh session per topic shift. Never balloon past 80k. Persist state to disk before compacting.
Bad: 120k tokens across 3 topics, hallucinating paths. Correct: Write state to PRD, compact, re-read state in fresh context.
