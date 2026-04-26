# Fixture #6 — Dual API: recommended vs not-recommended

**Source:** [`lib/hook-config.ts:28-110`](../../../../lib/hook-config.ts) — `readHookConfig` has two overloads, with the untyped one labeled `**ESCAPE HATCH**` and the schema overload labeled `(PREFERRED)`.

## Pattern

A single exported function exposes two overloads doing the same job. Doc comments tell callers which to prefer:
- Untyped: returns `T | null` (fail-open)
- Schema-validated: returns `Result<T, ResultError>` (fail-explicit)

Recommendations in code add confusion. If a path is "not recommended," delete it. There should be only one canonical way to call this.

## Detector criterion

Exported APIs (functions or overloads) where two paths cover the same use case AND one is documented as preferred / recommended / escape hatch / deprecated.

## Refactor outcome

Pick the canonical API (here: schema-validated). Delete the other. Migrate all callers.

## Detectability

Medium — needs to scan JSDoc/comments for "PREFERRED", "ESCAPE HATCH", "deprecated", "prefer", "recommended" markers paired with overload definitions.
