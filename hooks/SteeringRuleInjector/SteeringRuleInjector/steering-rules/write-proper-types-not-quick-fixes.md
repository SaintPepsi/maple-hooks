---
name: write-proper-types-not-quick-fixes
events: [PreToolUse]
keywords: [.ts, .tsx, Edit, Write]
---

When TypeScript code needs types, take the time to find and use the correct types. Do not reach for `any` or `unknown` as a first instinct. Read the relevant type definitions, check imported modules for exported types, and define proper interfaces for data shapes. `unknown` is only acceptable when the type is genuinely unknowable AND you add a type guard to narrow it. Speed of completion is never more important than type correctness. This applies to ALL TypeScript code, not just PAI hooks.
Bad: Hook blocks `any`. Replace with `unknown` to pass the gate. Ship it.
Bad: Need a function parameter type. Write `: unknown` without checking what types the caller actually passes.
Correct: Hook blocks `any`. Read the imported module's type exports. Find the correct type. Use it.
Correct: Need a function parameter type. Read the call sites, identify the data shape, define an interface, use it.
Correct: Genuinely unknowable type (JSON.parse result, catch error). Use `unknown` with a type guard that narrows before use.
