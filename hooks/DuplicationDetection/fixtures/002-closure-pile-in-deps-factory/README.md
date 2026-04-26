# Fixture #2 — Inline closure pile inside a deps factory

**Sources:**
- [`lib/obligation-machine.ts:178-220`](../../../../lib/obligation-machine.ts) (`createDefaultDeps`)
- [`hooks/ObligationStateMachines/DocObligationStateMachine.shared.ts:170-204`](../../../../hooks/ObligationStateMachines/DocObligationStateMachine.shared.ts) (`defaultDeps`)

## Pattern

An object literal where each property is a closure that wraps an fs adapter. Each closure follows the same recipe:

```
call adapter → check Result.ok → log with hook prefix → return default
```

The recipe shape repeats N times within a single object literal, and the same shape recurs across multiple `defaultDeps` factories in the codebase.

## Detector criterion

- Object literals where N+ properties are closures that share an internal recipe
- Cross-file: multiple files declaring `defaultDeps`-style objects with parallel closure shapes

## Refactor outcome

- Extract each closure into its own file (one function per file)
- Cross-check the codebase for matching helpers; consolidate into a shared folder
- `createDefaultDeps` (and parallel factories) become composition: import the helpers, build the object

## Detectability

High — AST shape match.
