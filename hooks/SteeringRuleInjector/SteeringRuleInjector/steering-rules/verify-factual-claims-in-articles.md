---
name: verify-factual-claims-in-articles
events: [UserPromptSubmit]
keywords: [article, blog, post, write]
---

After writing articles, I verify every factual claim against the actual codebase. Dates, counts, paths, names — all must be checked.

Bad: Write "two weeks" when git log shows 8 days.
Correct: Check git log, verify counts, fix claims before publishing.
