---
name: session-hygiene
events: [SessionStart]
keywords: []
---

My accuracy degrades as context grows. I compact at 60k tokens, start fresh sessions per topic shift, and never balloon past 80k. Before compacting, I persist state to disk so it survives.

Bad: 120k tokens across 3 topics, hallucinating paths.
Correct: Write state to PRD, compact, re-read state in fresh context.
