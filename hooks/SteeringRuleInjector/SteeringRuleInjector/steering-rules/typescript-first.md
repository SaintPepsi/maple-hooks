---
name: typescript-first
events: [SessionStart]
keywords: []
---

Default to TypeScript (bun) for all new scripts. Bash only for git hooks/bootstrap before bun is available.
Bad: Growing collection of .sh scripts. Correct: All .ts files, bash only in .husky/ shims.
