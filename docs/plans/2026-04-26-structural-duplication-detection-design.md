# Structural Duplication Detection — Design

**Date:** 2026-04-26
**Status:** Brainstorming — not yet ready for implementation
**Catalog:** [hooks/DuplicationDetection/research/FIXTURES.md](../../hooks/DuplicationDetection/research/FIXTURES.md)
**Prior art:** [hooks/DuplicationDetection/research/STRUCTURAL_DETECTION_RECOMMENDATIONS.md](../../hooks/DuplicationDetection/research/STRUCTURAL_DETECTION_RECOMMENDATIONS.md), [2026-04-06-pattern-detection-design.md](./2026-04-06-pattern-detection-design.md), [2026-04-19-structural-duplication-classification-exploration.md](./2026-04-19-structural-duplication-classification-exploration.md)

---

## Problem

The current 4-signal duplication detector (hash, name, signature, body fingerprint) catches exact and near-exact duplicates but misses **structural duplication** — code that follows the same recipe with different identifiers, types, or literals. Examples include path factories that differ only by file extension, closure piles inside `defaultDeps` factories, repeated `[HookName]` log prefixes, and runner-injectable wrappers like `getConfig`.

Ian curated 15 real-world WET examples from `maple-hooks` to drive the work. Each example is both a refactor target and a positive test case for the detector.

## Goals

1. Persist the 15 fixtures as durable, machine-checkable artifacts.
2. Build a detector capable of catching the high/medium-detectability fixtures.
3. Refactor the WET sites the detector identifies, using the detector itself as a regression guard.
4. Keep low-detectability fixtures (subjective patterns like railway composition, naming taste) as docs-only guidance.

## Non-goals

- Replacing the existing 4-signal composite detector. The new structural-detection signals augment it.
- Catching every conceivable duplication shape. Some fixtures (#7 library-replaceable, #8 railway, #13 schema-replaceable, #14 naming) are subjective and stay advisory.
- Running on external codebases. Scope is `maple-hooks`.

## Approach

### Layout

Per-fixture directories under `hooks/DuplicationDetection/fixtures/`:

```
fixtures/
└── 001-literal-only-diff/
    ├── README.md                              ← human spec (why this is WET)
    ├── positives/
    │   └── two-functions-one-extension-diff/
    │       └── module.ts                      ← scenario the detector should flag
    └── (optional) precision.test.ts           ← only when generic walker isn't enough
```

Each scenario is a self-contained mini-codebase. Single-file fixtures have one file per scenario; multi-file fixtures (e.g., #4 cross-hook duplicates) have N files modeling the cross-file pattern.

Negatives (false-positive guards) are deferred — we'll add them only when the detector actually misfires on something.

### Spec via tests, not JSON

- **README.md** — prose: "why this is WET, what the refactor looks like."
- **Walker test** (`fixtures.test.ts`) — generic: every `positives/<scenario>/` must produce ≥1 finding.
- **Per-fixture `.test.ts`** — only when precision matters (which pattern matched, exact files named, exact count).

No `expected.json`. Folder semantics carry the contract; precision tests handle the rare cases that need more.

### Regression strategy

- **CI gate:** `bun test hooks/DuplicationDetection` runs on every PR; fixture failures block merge.
- **Snapshot of production findings:** the detector runs across the full `maple-hooks` repo and writes findings to a snapshot. PRs that change the snapshot must commit it with explanation. Catches both new WET introductions and refactor successes.

### Detectability triage (from FIXTURES.md)

| Tier | Fixtures | Mechanism |
|---|---|---|
| High | #1, #2, #3, #4, #11, #15 | AST diff / shape match / call-site analysis |
| Medium | #5, #6, #9, #10, #12 | Heuristics + structural patterns |
| Hard | #7, #8, #13, #14 | Subjective — likely docs-only or advisory |

The detector targets the High tier first. Medium tier follows. Hard tier stays docs-only unless a deterministic encoding emerges.

## Open planning items

These remain to decide before implementation:

1. **Detector inventory** — what does the existing detector at `hooks/DuplicationDetection/` already expose? What entry points exist? What needs building? (Read `index-builder-logic.ts`, `parser.ts`, `shared.ts` before adding new detection logic.)
2. **Fixture order** — which fixture's TDD slice ships first? Recommendation: #1 (literal-only diff) — narrowest signal, cleanest refactor, validates the full pipeline.
3. **Refactor workflow** — when a WET site is refactored, what happens to its fixture? Options: (a) fixture stays, source-pointer in README updates to "refactored — pattern caught at PR #X"; (b) fixture moves from `positives/` to `negatives/` since the live code no longer matches.
4. **Snapshot format** — JSON file per pattern? One root snapshot? Bun `toMatchSnapshot()` style? Decision deferred until first detector slice runs.
5. **Detector entry point** — does the current detector expose a "scan this directory" function the walker test can call? If not, the walker needs a wrapper that builds a temporary index over the scenario directory.

## Cross-cutting principles surfaced by the fixtures

These showed up across multiple fixtures and become the meta-patterns the detector (and reviewers) should encode:

- **One function per file** — aggregator files hide duplication.
- **Runner-injection for known context** — `runHook` knows the hook name; contracts shouldn't redeclare it.
- **Railway-oriented orchestration** — pipelines over imperative branching.
- **Schema as single source of truth** — types and runtime validation from one declaration.
- **One canonical API** — delete deprecated paths instead of recommending against them.
- **Library over handroll** — for solved problems.

## Next step

Decide on the open planning items above, starting with **#1 detector inventory**. Until we know what the existing detector exposes, fixture wiring and detector design are guessing.
