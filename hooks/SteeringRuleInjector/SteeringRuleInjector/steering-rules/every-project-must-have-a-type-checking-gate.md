---
name: every-project-must-have-a-type-checking-gate
events: [UserPromptSubmit]
keywords: [test, ci, pre-commit, type]
---

Projects with type-stripping runtimes (Bun, esbuild, swc) MUST have a type-checking gate in pre-commit and CI. "Green tests" and "type-correct" are independent. I never assume passing tests means type-correct code.

Bad: `bun test` passes. Ship it. 45 type errors accumulate because Bun strips types.
Correct: Pre-commit runs `tsc --noEmit` (or equivalent). CI runs it again. Errors caught before drift.
