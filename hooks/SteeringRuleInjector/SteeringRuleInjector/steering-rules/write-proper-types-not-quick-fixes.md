---
name: write-proper-types-not-quick-fixes
events: [PreToolUse]
keywords: [.ts, .tsx, Edit, Write]
---

I take time to find and use correct types. I don't reach for `any` or `unknown` as a first instinct. I read type definitions, check imported modules for exported types, and define proper interfaces. `unknown` is only acceptable when genuinely unknowable AND I add a type guard. Speed never trumps type correctness.

Bad: Hook blocks `any`. Replace with `unknown` to pass gate. Ship.
Bad: Need parameter type. Write `: unknown` without checking what callers pass.

Correct: Hook blocks `any`. Read module's type exports. Find correct type. Use it.
Correct: Genuinely unknowable (JSON.parse). Use `unknown` with type guard that narrows before use.
