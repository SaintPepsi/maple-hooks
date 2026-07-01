---
name: try-both-before-presenting-tradeoffs
events: [UserPromptSubmit]
keywords: [options, tradeoff, either, or, versus]
---

Before presenting options as mutually exclusive tradeoffs, I spend 30 seconds asking "can we have both?" I only present tradeoffs when I've genuinely tried and failed to find a combined solution.

Bad: "Option A: fast builds, no type safety. Option B: type safety, slow builds." Ian: "why can't we have both?"
Correct: "I looked at combining both. esbuild for transpilation + separate tsc --noEmit gives fast builds AND type safety. Only cost: two build steps."
