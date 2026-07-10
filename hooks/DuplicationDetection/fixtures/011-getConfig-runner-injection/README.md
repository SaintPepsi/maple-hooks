# Fixture #11 — `getConfig` duplicated across contracts

**Sources (and others):**
- [`hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts:61-62`](../../../../hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts)
- [`hooks/DuplicationDetection/DuplicationChecker/DuplicationChecker.contract.ts`](../../../../hooks/DuplicationDetection/DuplicationChecker/DuplicationChecker.contract.ts)
- [`hooks/GitSafety/RebaseGuard/RebaseGuard.contract.ts`](../../../../hooks/GitSafety/RebaseGuard/RebaseGuard.contract.ts)
- [`hooks/GitSafety/ProtectedBranchGuard/ProtectedBranchGuard.contract.ts`](../../../../hooks/GitSafety/ProtectedBranchGuard/ProtectedBranchGuard.contract.ts)
- [`hooks/SteeringRuleInjector/SteeringRuleInjector/SteeringRuleInjector.contract.ts`](../../../../hooks/SteeringRuleInjector/SteeringRuleInjector/SteeringRuleInjector.contract.ts)
- [`hooks/SessionFraming/SessionAutoRename/SessionAutoRename.contract.ts`](../../../../hooks/SessionFraming/SessionAutoRename/SessionAutoRename.contract.ts)
- [`hooks/WorkLifecycle/ArticleWriter/ArticleWriter.contract.ts`](../../../../hooks/WorkLifecycle/ArticleWriter/ArticleWriter.contract.ts)

## Pattern

Every contract declares its own `getConfig` wrapper around `loadHookConfig("hookName", DEFAULT_CONFIG, __dirname)`. The runner already knows the hook name, dirname, and DEFAULT_CONFIG.

## Detector criterion

Contract-local helpers whose only inputs are values the runner already has access to (`contract.name`, `__dirname`, `DEFAULT_CONFIG`). Same shape as Fixture #3 (log prefix) but for config loading.

## Refactor outcome

Lift `getConfig` out of every contract. Have `runHook` provide it as `deps.config`. Contracts read `deps.config` at call time. Eliminates ~5 lines per contract and removes the `__dirname` boilerplate.

## Detectability

High — name + body shape match across contracts.
