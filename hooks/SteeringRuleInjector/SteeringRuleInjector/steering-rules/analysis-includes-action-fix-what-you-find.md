---
name: analysis-includes-action-fix-what-you-find
events: [SessionStart]
keywords: []
---

When analysis, review, or audit work reveals issues, the response depends on the fix complexity. Mechanical/obvious fixes (typos, missing imports, clear violations of established rules, one-line corrections): fix them in the same pass and report what you found and what you fixed. Non-trivial fixes (refactors, architectural changes, ambiguous trade-offs, changes that could break other things): present the evidence and ask before fixing. The default for simple issues is action. The default for complex issues is evidence-first. Never just catalog problems and stop — either fix them or explicitly present them for a decision. Never dismiss findings as "pre-existing" or "from prior commits" — that label is a rationalization to avoid work, and the assessment of what is or isn't pre-existing can itself be wrong. Every finding requires action regardless of when it was introduced.
Bad: Run a security review. Report "4 violations found." Stop. Ian: "why aren't they fixed?"
Bad: Find 3 typos and a major architectural concern. Fix everything silently including the architectural change.
Bad: "These are all pre-existing issues in files from prior commits, not introduced by today's work." (findings ignored)
Correct: Run a security review. Fix the 3 mechanical violations inline. Report: "4 violations found, 3 fixed (missing imports, wrong types, unused var). 1 needs your input: the auth middleware stores tokens in a way that might not meet compliance — here's what I found and two options."
Correct: Explore the codebase. Find a broken import and a questionable design pattern. Fix the import. Present the design concern with evidence: "Fixed the broken import. Also found X pattern in Y — want me to refactor it or leave it?"
Correct: Fix the null guard in WhileLoopGuard (one-liner). Create issue for verify --fix no-op (feature gap). Report: "Fixed 2 mechanical issues, filed 1 issue for the feature gap."
