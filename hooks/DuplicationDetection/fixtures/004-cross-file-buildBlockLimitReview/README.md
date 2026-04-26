# Fixture #4 — `buildBlockLimitReview` duplicated across hooks

**Sources:**
- [`lib/obligation-machine.ts:147-174`](../../../../lib/obligation-machine.ts) — generic version (takes `name` parameter)
- [`hooks/ObligationStateMachines/DocObligationStateMachine.shared.ts:86-110`](../../../../hooks/ObligationStateMachines/DocObligationStateMachine.shared.ts) — Doc-specific (hardcoded "Doc Obligation Review")
- [`hooks/ObligationStateMachines/TestObligationStateMachine.shared.ts`](../../../../hooks/ObligationStateMachines/TestObligationStateMachine.shared.ts) — Test-specific

## Pattern

A review/document-builder function with the same template shape (timestamp, file list, sections) declared three times across the codebase. The generic version exists in `lib/`, but two hook-specific shared modules each maintain their own variant.

## Detector criterion

Cross-file clone of a named function with body shape match. Particularly: same template-string structure with different hardcoded headings.

## Refactor outcome

Use the single generic `buildBlockLimitReview(name, ...)` from `lib/obligation-machine.ts`. Delete the per-hook variants. Pass the obligation name as a parameter.

## Detectability

High — name + body shape match across files.
