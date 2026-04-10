---
name: every-project-must-have-a-type-checking-gate
events: [SessionStart]
keywords: []
---

Projects using type-stripping runtimes (Bun, esbuild, swc, ts-node transpile-only) MUST have a type-checking gate in pre-commit and CI. "Green tests" and "type-correct" are independent properties. The specific command depends on the project toolchain: `tsc --noEmit` for plain TypeScript, `svelte-check` for SvelteKit, `eslint --max-warnings 0` for ESLint-typed projects, or the project's equivalent. Never assume passing tests means type-correct code.
Bad: `bun test` passes. Ship it. 45 type errors accumulate silently because Bun strips types at runtime.
Correct: Pre-commit runs the project's type-checking command. CI runs it again. Type errors are caught before they drift.
