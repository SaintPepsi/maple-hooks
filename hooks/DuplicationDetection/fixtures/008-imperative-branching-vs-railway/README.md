# Fixture #8 — Imperative branching → railway-oriented composition

**Sources (all need same treatment):**
- [`lib/hook-config.ts:143-168`](../../../../lib/hook-config.ts) — `loadHookConfig`
- [`lib/hook-config.ts:170-206`](../../../../lib/hook-config.ts) — `readRaw`
- [`hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts:202-278`](../../../../hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts) — `execute`
- [`hooks/CodeQualityPipeline/CodeQualityGuard/CodeQualityGuard.contract.ts:169-302`](../../../../hooks/CodeQualityPipeline/CodeQualityGuard/CodeQualityGuard.contract.ts) — `execute`

## Pattern

Orchestration functions whose body is `if (x.ok) { mutate } if (y) { mutate }` — a sequence of conditional mutations on shared state instead of pipeline composition. Branching at the orchestration layer makes success/skip/block lanes hard to follow.

## Detector criterion

Functions with N+ early-return branches OR N+ conditional mutation blocks at the top level. Indicates the body should be decomposed into named pipeline steps where branching lives inside each leaf function.

## Refactor outcome

```
defaults → mergeLocalConfig() → mergeHookConfig() → return
```

Each step is a self-contained function: takes config in, returns config out, handles its own conditionals internally. Top-level orchestrator is a straight chain with no branches.

## Detectability

Hard — subjective; many valid shapes. Likely advisory.
