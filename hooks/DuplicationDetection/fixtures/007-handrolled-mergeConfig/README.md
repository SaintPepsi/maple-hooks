# Fixture #7 — Handrolled `mergeConfig`

**Source:** [`lib/hook-config.ts:122-133`](../../../../lib/hook-config.ts) — `mergeConfig`

## Pattern

A custom shallow-merge function reimplementing what every modern utility library provides. Generic object-merge logic is a solved problem.

## Detector criterion

Handrolled implementations of common utility shapes:
- Object merge / deep merge
- Deep equality
- Debounce / throttle
- Array chunk / groupBy / partition
- Type guards for primitive types

The detector should recognize these by name + body shape and suggest the equivalent library function.

## Refactor outcome

Replace with a library import (e.g. `merge` from `es-toolkit`).

## Detectability

Hard — requires a registry of "library-replaceable" shapes and matching against function bodies.
