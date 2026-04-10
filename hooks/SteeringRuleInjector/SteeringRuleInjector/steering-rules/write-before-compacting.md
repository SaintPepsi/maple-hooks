---
name: write-before-compacting
events: [PreCompact]
keywords: []
---

Before any compaction, persist key state to file. Post-compaction, read file instead of reconstructing.
Bad: Reconstruct from degraded context. Correct: Write PROGRESS.md with ISC status + decisions, compact, read it back.
