# Fixture #5 — Function-pile-in-shared-module

**Source:** [`hooks/ObligationStateMachines/DocObligationStateMachine.shared.ts`](../../../../hooks/ObligationStateMachines/DocObligationStateMachine.shared.ts)

## Pattern

A `*.shared.ts` file aggregating many discrete functions (helpers, predicates, default-deps factory, path constructors, review builder, exclude-pattern reader, etc.). Aggregation hides duplication: when each function lives in its own file, identical or near-identical helpers across the codebase become visible to humans.

## Detector criterion

Module-aggregated function piles in `*.shared.ts` files: heuristic on file size + exported function count + diversity of function purposes.

## Refactor outcome

Move most functions out of the aggregator into their own files (one function per file). The `*.shared.ts` either becomes a thin re-export barrel or disappears entirely.

## Detectability

Medium — heuristic; needs threshold tuning to avoid flagging legitimately-cohesive modules.
