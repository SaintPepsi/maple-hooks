# Pattern Duplication Detector — Final Spike Report

**Date:** 2026-03-27
**Duration:** 8 exploration cycles over ~3 hours
**Corpus:** pai-hooks — 214 files, 837 functions
**Artifacts:** 8 variant scripts, 391 tests, 7392 lines of code, 3 design docs

## Executive Summary

Static analysis can detect code duplication across multiple dimensions without inference or token cost. A composite approach using 3 core signals (structural hash, function name, type signature) covers 82% of functions in the pai-hooks codebase. The remaining 18% are genuinely unique — no duplication to find.

The highest-value refactoring targets are:
1. **runHook** — 13 identical copies across test files (all 4 signals at 100%)
2. **getFilePath** — 12 identical copies across hook contracts
3. **Obligation state machine core** — 6 functions replicated across 4 files at 97% body similarity
4. **makeDeps** — 44 instances across 44 test files (75% body similarity)
5. **makeInput** — 31 instances across 31 test files (95% body similarity)

## What We Explored

| Cycle | Approach | Signal Type | Clusters | Key Finding |
|-------|----------|-------------|----------|-------------|
| 0 | Structural hash | Exact match | 47 | Zero false positives, catches only identical bodies |
| 1 | N-gram subsequence | Approximate match | 73-94 | Template patterns via Jaccard similarity on AST n-grams |
| 2 | ~~CFG skeleton~~ | Control flow | 12-137 | **Superseded** — body fingerprint subsumes this signal. Research value only. |
| 3 | Role naming | Semantic (names) | 25 | 44 makeDeps factories, all structurally validated |
| 4 | File template | File-level | 13+94 fuzzy | 62% of test files follow copy-paste templates |
| 5 | Type signature | Type-gated similarity | 47 | 708 functions in name-diverse clusters (85% of codebase) |
| 6 | **Composite ranker** | **Multi-signal fusion** | **71** | **THE PRODUCTION ENGINE.** Fuses 4 signals into ranked list. Its threshold logic (4/4=block, 3/4=suggest) powers the DuplicationChecker hook. |
| 7 | Persistent index | Production bridge | — | 166KB index, 1ms load, 3-17ms per-file checks |
| 8 | Co-occurrence | Function tuples | 5 | 6-function obligation template at 97% similarity |

## Signal Effectiveness

| Signal | Unique Finds | Coverage | Precision | Cost |
|--------|-------------|----------|-----------|------|
| Structural hash | 6 functions only hash catches | 15% | 100% | O(1) per function |
| Function name (3+) | 6 functions only name catches | 22% | High (all validated) | O(1) per function |
| Type signature (5+) | 454 functions only sig catches | 82% (union) | Medium (some noise in large groups) | O(1) per function |
| Body fingerprint | — (used within sig groups) | Improves sig precision | High when gated by sig | O(1) per comparison |

**Key insight:** Type signature is the highest-coverage signal (catches 454 functions no other signal finds) but has lower precision alone. Combined with hash + name, the 3-signal composite achieves 82% coverage at high precision.

## Dimension Distribution (Composite Ranker)

```
4 dimensions:  69 functions  ████████████████  ← near-certain refactoring targets
3 dimensions: 145 functions  ██████████████████████████████  ← strong candidates
2 dimensions: 387 functions  ████████████████████████████████████████████  ← moderate signal
1 dimension:  132 functions  ██████████████████████████████  ← weak signal
0 dimensions: 149 functions  ██████████████████████████████  ← genuinely unique
```

## Top Refactoring Opportunities

### Tier 1: Extract immediately (4/4 dimensions, 100% body similarity)

| Function | Instances | Action |
|----------|-----------|--------|
| `runHook` | 13 test files | Extract to `core/test-helpers.ts` |
| `getFilePath` | 12 contracts | Extract to `core/contract-helpers.ts` |
| `blockCountPath` | 6 obligation files | Import from `ObligationStateMachines/shared.ts` |
| `pendingPath` | 4 obligation files | Import from `ObligationStateMachines/shared.ts` |
| `makeToolInput` | 4 test files | Extract to shared test utility |
| `getCommand` | 5 contracts | Extract to `core/contract-helpers.ts` |

### Tier 2: Extract with minor adaptation (3/4 dimensions)

| Function | Instances | Notes |
|----------|-----------|-------|
| `makeInput` | 31 test files | 95% body similarity — nearly identical factories |
| `makeDeps` | 44 test files | 75% body similarity — each builds different Deps shape, may need generic factory |
| `run` | 9 files | 77% similarity — different enough to need a shared base pattern |
| `getStateDir` | 7 obligation files | 88% similarity — extract with parameterization |

### Tier 3: Template patterns (file-level)

| Template | Files | Action |
|----------|-------|--------|
| `{makeDeps, makeInput}` test template | 26 files | Consider a test scaffold generator |
| `{runHook}` integration test template | 12 files | Shared `runHookTest` utility |
| `shared.ts` → `Tracker/*.ts` near-clones | 4 pairs | Trackers should re-export from shared |

## Production Architecture (Council-Approved)

**Position B: Background index + lightweight lookup hook**

```
Session start → DuplicationIndexBuilder builds .duplication-index.json (215ms, 166KB)
                          │
Every .ts Write → DuplicationChecker reads index (1ms), checks file (3-17ms)
                          │
                   3+ dimensions? → One-line advisory in additionalContext
                   <3 dimensions? → Silent (no context waste)
                   Index stale?   → "stale:" prefix (never silent about staleness)
```

Design docs at:
- `docs/plans/2026-03-27-duplication-hook-architecture.md`
- `docs/plans/2026-03-27-duplication-index-builder-hook-design.md`
- `docs/plans/2026-03-27-duplication-checker-hook-design.md`

## What We Learned

1. **No single signal catches everything.** Hash finds exact matches, names find role-based duplication, type signatures find different-name duplicates, co-occurrence finds template tuples. Each reveals a different class.

2. **Multi-signal convergence is the best proxy for "should refactor."** A function hitting 4/4 dimensions is near-certainly duplicated. Instance count alone is misleading — `makeDeps` has 44 instances but lower dimensional convergence than `runHook` with 13.

3. **The 200ms parse-all-files cost is the critical bottleneck.** Every variant spends 200ms parsing before doing anything useful. The persistent index (cycle 7) solves this — 1ms load, sub-20ms checks.

4. **Body fingerprinting via top-16 node type frequency vectors is surprisingly effective.** Condensing ~69 AST nodes into a 32-char hex string loses some precision but enables O(1) cosine similarity and keeps the index at 166KB instead of 1MB.

5. **File-level and tuple-level analysis reveals patterns invisible to function-level analysis.** 62% of test files follow copy-paste templates. The obligation state machines share a 6-function core at 97% similarity.

## Files Produced

```
Tools/pattern-detector/
├── README.md                              # Tool documentation
├── WORKLOG.md                             # Cycle-by-cycle research log
├── REPORT.md                              # This report
├── types.ts                               # Shared type definitions
├── adapters.ts                            # I/O adapters
├── parse.ts                               # SWC parser wrapper
├── similarity.ts                          # Body similarity utilities
├── format.ts                              # Output formatter
├── index.ts                               # CLI entry (baseline detectors)
├── detectors/
│   ├── import-fingerprint.ts              # Baseline Detector A
│   ├── structural-hash.ts                 # Baseline Detector B
│   ├── layered.ts                         # Baseline Detector C
│   ├── layered-scoring.ts                 # Detector C internals
│   ├── layered-clusters.ts                # Detector C internals
│   └── layered-assembly.ts               # Detector C internals
└── variants/
    ├── ngram-subsequence.ts               # Cycle 1: N-gram detection
    ├── cfg-skeleton.ts                    # Cycle 2: CFG skeleton
    ├── role-naming.ts                     # Cycle 3: Role-based naming
    ├── file-template.ts                   # Cycle 4: File-level templates
    ├── type-signature.ts                  # Cycle 5: Type signature clustering
    ├── composite-ranker.ts                # Cycle 6: Multi-signal ranking
    ├── index-builder.ts                   # Cycle 7: Persistent index
    └── cooccurrence.ts                    # Cycle 8: Co-occurrence mining
```

Plus 12 test files with 391 tests and 3 design documents.
