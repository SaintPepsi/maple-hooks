# Fixture #15 — Test-only functions in a production contract file

**Source:** [`hooks/CodeQualityPipeline/CodeQualityGuard/CodeQualityGuard.contract.ts:46-59`](../../../../hooks/CodeQualityPipeline/CodeQualityGuard/CodeQualityGuard.contract.ts) — exports `_resetViolationCache`, `_setViolationCacheEntry`, `_getViolationCacheEntry`. The leading underscore + JSDoc comment "Test-only" make it explicit.

## Pattern

Production contract files exporting helpers prefixed with `_` (or annotated as "test-only") that exist solely to manipulate internal state from tests.

## Detector criterion

Exported helpers in `*.contract.ts` (or any production file) where:
- The export name starts with `_`, OR
- The JSDoc contains "Test-only", "for tests", "test helper", or similar
- AND the only call sites are `*.test.ts` files

## Refactor outcome

Move test-only helpers into a sibling test-utilities module, or use module-augmentation/dependency injection so tests can reach the state without backdoor exports.

## Detectability

High — name prefix + JSDoc string + call-site analysis.
