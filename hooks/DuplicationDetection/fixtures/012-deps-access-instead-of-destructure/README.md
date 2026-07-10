# Fixture #12 — `deps.x` access instead of destructuring

**Source:** Broadly across `execute()` bodies in contracts, e.g. [`hooks/CodeQualityPipeline/CodeQualityGuard/CodeQualityGuard.contract.ts:169-302`](../../../../hooks/CodeQualityPipeline/CodeQualityGuard/CodeQualityGuard.contract.ts) — uses `deps.readFile`, `deps.getLanguageProfile`, `deps.scoreFile`, `deps.formatDelta`, `deps.dedup`, `deps.formatAdvisory`, `deps.signal`, `deps.stderr` repeatedly.

## Pattern

A function body with N+ accesses on a single `deps` parameter (`deps.readFile`, `deps.writeFile`, `deps.stderr`, …) instead of destructuring the dependency surface at the function entry. The reader has to scan the whole body to learn which capabilities are actually used.

## Detector criterion

Function body with ≥4 distinct `<paramName>.<member>` accesses on a parameter whose type is a `Deps`-like interface, where the parameter is not destructured at the signature.

## Refactor outcome

Destructure at the signature: `({ readFile, scoreFile, stderr })`. The capability surface is now visible from the function header.

## Detectability

Medium — readability/visibility signal; needs threshold tuning.
