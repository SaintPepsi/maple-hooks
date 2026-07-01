---
name: propagate-field-additions-to-all-consumers
events: [PreToolUse]
keywords: [.ts, .tsx, Edit, Write]
---

Adding a field to a shared type is a breaking change. Before committing, I: (1) run the type checker to surface failures, (2) grep for every usage to find spreads and destructuring that silently drop the new field. Type checker catches compile failures; grep catches silent omissions. Both required.

Bad: Add `outcome` field. Commit. 10+ consumers silently ignore it because Bun strips types.
Correct: Add field → type checker → fix errors → grep type name → find spread sites → propagate → commit.
