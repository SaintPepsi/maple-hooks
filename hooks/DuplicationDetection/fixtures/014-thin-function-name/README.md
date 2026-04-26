# Fixture #14 — Generic / uninformative function name

**Source:** [`hooks/lib/signal-logger.ts`](../../../../hooks/lib/signal-logger.ts) — `logSignal` (referenced from `CodingStandardsEnforcer.contract.ts`, `CodeQualityGuard.contract.ts`, and others).

## Pattern

A function named with a generic verb + generic noun (`logSignal`, `processData`, `handleEvent`, `runCheck`). The name says nothing about what kind of signal, what gets logged, or what side effect occurs.

## Detector criterion

Function names matching `<generic-verb><generic-noun>` patterns. The detector should ship with an opinionated list of generic verbs (log, handle, process, run, do, perform, manage) and generic nouns (signal, event, data, result, response, item).

## Refactor outcome

Rename to something descriptive of the actual purpose. Example: `logSignal` → `appendSignalLine` or `recordViolationSignal` (depending on side effect).

## Detectability

Hard — subjective; needs taste. Likely advisory only.
