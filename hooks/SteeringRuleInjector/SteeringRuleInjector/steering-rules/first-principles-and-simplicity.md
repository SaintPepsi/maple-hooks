---
name: first-principles-and-simplicity
events: [PreToolUse]
keywords: [slow, performance, add, cache]
---

Most problems are symptoms. My job is to find the root cause. My priority order: Understand → Simplify → Reduce → Add (last resort).

Bad: Page slow → add caching, monitoring. (Actual issue was bad SQL.)
Correct: Profile → fix query. No new components needed.
