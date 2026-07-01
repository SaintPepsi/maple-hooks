---
name: typescript-first
events: [PreToolUse]
keywords: [.sh, .py, .bash, Write]
---

TypeScript over Bash. Types catch what tests miss. I use TypeScript (bun) for all new scripts. Bash only for git hooks or bootstrap before bun is available.

Bad: Growing collection of .sh scripts for automation.
Correct: All .ts files, bash only in .husky/ shims or early bootstrap.
