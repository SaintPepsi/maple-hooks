# Structural Duplication Fixtures

Real-world WET examples from `maple-hooks`, captured to drive structural-duplication detection. Each fixture is both a refactor target and a positive test case for the detector.

**Source:** Hand-curated by Ian during code review on 2026-04-26.

---

## Cross-cutting principles

These showed up across multiple fixtures and are the meta-patterns to encode:

- **One function per file** — aggregator files (`*.shared.ts`, `defaultDeps` literals) hide duplication; splitting makes it visible.
- **Runner-injection for known context** — when `runHook` already knows the hook name, contracts shouldn't redeclare `[HookName]` prefixes or `getConfig()` wrappers.
- **Railway-oriented orchestration** — replace `if (x) { mutate } if (y) { mutate }` with named pipeline steps; branching belongs inside leaf functions.
- **Schema as single source of truth** — derive TypeScript types from runtime schemas (Effect); replace if-chain validation with `parse → return`.
- **One canonical API** — if a path is "not recommended," delete it. Recommendations are duplication of intent.
- **Library over handroll** — generic utilities (object merge, etc.) are solved problems.

---

## Fixtures

### #1 — Path factories differing only by extension

- **Source:** `lib/obligation-machine.ts:52-58`
- **Pattern:** `pendingPath` and `blockCountPath` — identical signature and body, only `.json` vs `.txt` differs.
- **Detector criterion:** AST diff where only literal-string nodes differ between two functions.
- **Refactor:** single `sessionFilePath(stateDir, prefix, sessionId, ext)` factory. Naming must match the rest of `obligation-machine.ts`.
- **Detectability:** High — pure AST diff.

### #2 — Inline closure pile inside a deps factory

- **Source:** `lib/obligation-machine.ts:178-220` (`createDefaultDeps`'s 7 closures); recurrence observed in another `defaultDeps` site.
- **Pattern:** object literal where each property is a closure wrapping an fs adapter — `call adapter → check Result.ok → log with hook prefix → return default`.
- **Detector criterion:** object-of-closures shape where N+ closures share the same recipe.
- **Refactor:** one file per extracted helper; cross-check codebase for duplicates; consolidate into a shared folder.
- **Detectability:** High — AST shape match.

### #3 — `[HookName]` log prefix repeated across hooks

- **Sources:**
  - `lib/obligation-machine.ts` — `deps.stderr(\`[${config.name}Enforcer] ...\`)`
  - `hooks/ObligationStateMachines/HookDocEnforcer/HookDocEnforcer.contract.ts` — `deps.stderr(\`[HookDocEnforcer] ${result.pending.length} hook(s) need docs (non-blocking mode)\`)`
- **Pattern:** every contract manually prefixes log lines with its own `[HookName]`. The runner already knows the name.
- **Detector criterion:** literal prefix on `stderr`/log call that matches the contract's own `name` field.
- **Refactor:** `runHook` provides a prefixed logger (`outputMessage`) on `deps`; contracts call `deps.outputMessage('Block ...')` with no prefix.
- **Detectability:** High.

### #4 — `buildBlockLimitReview` duplicated across hooks

- **Source:** `lib/obligation-machine.ts` (canonical) + other hook locations observed while scanning.
- **Pattern:** a review/document-builder function repeated across multiple hook directories.
- **Detector criterion:** named functions sharing body shape across files (cross-file clone).
- **Refactor:** extract to its own file; all hooks import the single implementation.
- **Detectability:** High — name + body match.

### #5 — One-function-per-file in shared modules

- **Source:** `hooks/ObligationStateMachines/DocObligationStateMachine.shared.ts`
- **Directive:** move most functions out of the `*.shared.ts` aggregator into their own files.
- **Rationale:** one-function-per-file makes WET visible to humans; aggregation hides duplicates.
- **Detector criterion implication:** module-aggregated function piles in `*.shared.ts` files are a structural smell — splitting will reveal duplication.
- **Detectability:** Medium — heuristic on file size + export count.

### #6 — `lib/hook-config.ts` consolidation

- **Source:** `lib/hook-config.ts`
- **Directive A:** split functions into one-file-each (per #5).
- **Directive B:** remove the non-recommended way of calling `readHookConfig`. Keep only the canonical call path.
- **Rationale:** recommendations in code add confusion — if a path is "not recommended," delete it. There should be only one way.
- **Detector criterion implication:** flag exported APIs where two functions/overloads cover the same use case and one is documented as preferred.
- **Detectability:** Medium.

### #7 — `mergeConfig` should be a library import

- **Source:** `lib/hook-config.ts` — `mergeConfig` (used inside `loadHookConfig`).
- **Directive:** use a library (e.g. es-toolkit) instead of a custom implementation.
- **Rationale:** don't reinvent generic object-merge logic.
- **Detector criterion implication:** flag handrolled implementations of common utility shapes (object merge, deep equality, debounce, chunk, groupBy) as library-replacement candidates.
- **Detectability:** Hard — needs library API knowledge.

### #8 — Imperative branching → railway-oriented composition

- **Sources (all same treatment):**
  - `lib/hook-config.ts` — `loadHookConfig`
  - `lib/hook-config.ts` — `readRaw`
  - `hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts` — `execute`
  - `hooks/CodeQualityPipeline/CodeQualityGuard/CodeQualityGuard.contract.ts` — `execute`
- **Pattern:** orchestration functions whose body is `if (x.ok) { mutate } if (y) { mutate }` instead of pipeline composition.
- **Refactor:** decompose into named pipeline steps — e.g. `defaults → mergeLocalConfig() → mergeHookConfig() → return`. No if/else at the orchestration layer; branching lives inside leaf functions.
- **Detector criterion:** functions with N+ early-return branches or N+ conditional mutation blocks at the top level.
- **Detectability:** Hard — subjective; many valid shapes.

### #9 — Function-pile organization in contracts

- **Source:** `hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts`
- **Directive:** move all helper functions into their own files OR group them as a static class.
- **Rationale:** contract files should show only the contract; helpers belong elsewhere.
- **Detector criterion:** contract files with N+ standalone helper functions co-located inside them.
- **Detectability:** Medium.

### #10 — Schema-derived types instead of hand-typed defaults

- **Source:** `hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts` — `DEFAULT_CONFIG` and its accompanying interface.
- **Directive:** define an Effect schema for `DEFAULT_CONFIG`. Derive the TypeScript type from the schema.
- **Rationale:** schema is the single source of truth — runtime validation + compile-time types from one declaration; no drift.
- **Detector criterion:** any pattern of `interface XConfig { ... }` paired with `const DEFAULT_CONFIG: XConfig = { ... }` maintained separately.
- **Detectability:** Medium.

### #11 — `getConfig` runner-injection

- **Source:** `hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts` — `getConfig` (and the same shape across other contracts that call `loadHookConfig`).
- **Directive:** lift `getConfig` out of every contract; have `runHook` provide it.
- **Rationale:** same as #3 — when the runner already knows hook name + dirname + DEFAULT_CONFIG, repeating `loadHookConfig("hookName", DEFAULT_CONFIG, __dirname)` in every contract duplicates context available one layer up.
- **Detector criterion:** contract-local helpers whose only inputs are values the runner already has.
- **Detectability:** High.

### #12 — Destructure deps instead of `deps.x` access

- **Source:** broadly across `execute()` bodies in contracts.
- **Directive:** destructure deps at the function signature: `({ readFile, writeFile, stderr })` instead of repeated `deps.readFile`, `deps.writeFile`, `deps.stderr`.
- **Rationale:** visible surface — destructuring shows which tools the function actually uses; `deps.x` access hides the effective dependency set.
- **Detector criterion:** function bodies with N+ `deps.*` accesses where destructuring would compress and clarify.
- **Detectability:** Medium.

### #13 — Schema-based input validation replacing if-statement chains

- **Source:** `hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts` — `getEditParts`
- **Directive:** replace if-statement validation chain with an Effect schema. The function body collapses to one `parse → return`.
- **Rationale:** schema parsing handles validation, type narrowing, and error reporting in one declaration. If-chains are an imperative reimplementation of what a schema parser does correctly.
- **Detector criterion:** functions whose body is a sequence of `if (!x.foo) return ...; if (typeof x.bar !== "string") return ...; if (!x.baz) return ...` — manual structural validation followed by extraction.
- **Detectability:** Hard — subjective.

### #14 — Generic/uninformative function names

- **Source:** `logSignal` (referenced in `CodingStandardsEnforcer.contract.ts` and other call sites).
- **Directive:** rename to something descriptive of what is being logged.
- **Rationale:** `logSignal` says nothing about what kind of signal, what it's for, or what side effect occurs. The name should let a reader understand the call without jumping to the definition.
- **Detector criterion:** function names that are semantically thin — verbs paired with generic nouns (`logSignal`, `processData`, `handleEvent`, `runCheck`).
- **Detectability:** Hard — subjective; needs taste.

### #15 — Test-only functions polluting production files

- **Source:** `hooks/CodeQualityPipeline/CodeQualityGuard/CodeQualityGuard.contract.ts`
- **Directive:** move test-only helpers to a shared test folder.
- **Rationale:** contract files should contain only contract behavior. Helpers that exist solely for tests inflate the main file.
- **Detector criterion:** exported helpers in production files whose only call sites are `*.test.ts` files.
- **Detectability:** High — call-site analysis.

---

## Detectability summary

| Tier | Fixtures | Mechanism |
|---|---|---|
| High | #1, #2, #3, #4, #11, #15 | AST diff / shape match / call-site analysis |
| Medium | #5, #6, #9, #10, #12 | Heuristics + structural patterns |
| Hard | #7, #8, #13, #14 | Subjective — likely docs-only or advisory |
