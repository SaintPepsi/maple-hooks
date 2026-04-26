# Fixture #1 — Path factories differing only by extension

**Source:** [`lib/obligation-machine.ts:52-58`](../../../../lib/obligation-machine.ts)

## Pattern

Two functions with identical signatures and identical bodies. The only difference is one literal-string node (`.json` vs `.txt`).

## Detector criterion

Detect pairs/groups of functions whose ASTs differ only in literal-string (or other primitive-literal) nodes.

## Refactor outcome

Replace with a single factory: `sessionFilePath(stateDir, prefix, sessionId, ext)`. Naming must match the rest of `lib/obligation-machine.ts`.

## Detectability

High — pure AST diff.
