# Fixture #9 — Function-pile organization in a contract file

**Source:** [`hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts`](../../../../hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts) — declares `getWriteContent`, `getEditParts`, `applyEdit`, `formatBlockMessage`, `getExportDefaultExclusions`, `isSkippedByConfig`, plus the contract itself, all in one file.

## Pattern

A `.contract.ts` file containing N+ standalone helper functions co-located with the contract definition. Contract files should show only the contract.

## Detector criterion

Contract files (`*.contract.ts`) where the count of non-contract function declarations exceeds a threshold (e.g. 3+).

## Refactor outcome

Either:
- Move all helpers into their own files (one function per file), or
- Group them as a static class

The contract file then contains only the contract.

## Detectability

Medium — file path heuristic + function-declaration count.
