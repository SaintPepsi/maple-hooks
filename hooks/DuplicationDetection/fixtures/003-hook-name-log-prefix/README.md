# Fixture #3 — `[HookName]` log prefix repeated across hooks

**Sources:**
- [`lib/obligation-machine.ts`](../../../../lib/obligation-machine.ts) — `[${config.name}Enforcer]` prefixes inside `createDefaultDeps` and `checkObligation`
- [`hooks/ObligationStateMachines/HookDocEnforcer/HookDocEnforcer.contract.ts`](../../../../hooks/ObligationStateMachines/HookDocEnforcer/HookDocEnforcer.contract.ts) — `[HookDocEnforcer]` prefix
- [`hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts`](../../../../hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts) — `[CodingStandardsEnforcer]` prefix
- [`hooks/CodeQualityPipeline/CodeQualityGuard/CodeQualityGuard.contract.ts`](../../../../hooks/CodeQualityPipeline/CodeQualityGuard/CodeQualityGuard.contract.ts) — `[CodeQualityGuard]` prefix

## Pattern

Every contract that emits log lines manually prefixes them with its own `[HookName]`. The runner already knows the hook's name (it's in `contract.name`).

## Detector criterion

Literal-prefix on a `stderr` or log call that matches the contract's own `name` field. The prefix is duplication of metadata available one layer up at the runner.

## Refactor outcome

`runHook` provides a prefixed logger (e.g. `outputMessage`) on `deps`. Contracts call `deps.outputMessage("Block ...")` with no manual prefix. The runner injects `[HookName]` automatically using the contract's `name`.

## Detectability

High — string-literal pattern + context lookup against `contract.name`.
