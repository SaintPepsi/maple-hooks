---
name: check-for-regressions-after-fixes
events: [PostToolUse]
keywords: [Edit, Write]
---

After applying any fix, verify that adjacent functionality still works. Run existing tests. If fixing a UI component, check sibling components and animations. A fix that solves one problem and creates another is not a fix.
Bad: Fix carousel scroll behavior. Push. Ian discovers animations are broken and overflow is wrong.
Correct: Fix carousel scroll behavior. Run existing tests. Check animation behavior still works. Verify no regressions before claiming completion.
