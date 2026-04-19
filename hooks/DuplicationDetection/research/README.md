# Pattern Duplication Detector

**Status:** Exploration spike — not production code.

Static analysis tool that detects structurally similar code (WET patterns) using AST fingerprinting via `@swc/core`. Designed to surface candidates for DRY refactoring across large TypeScript codebases.

Design doc: `docs/plans/2026-03-26-pattern-duplication-detector-design.md`

---

## Detectors

| ID  | Name               | Strategy                                     | Source                                                               |
| --- | ------------------ | -------------------------------------------- | -------------------------------------------------------------------- |
| A   | Import Fingerprint | Groups files by their import signature       | [`detectors/import-fingerprint.ts`](detectors/import-fingerprint.ts) |
| B   | Structural Hash    | Exact AST structural match (type-erased)     | [`detectors/structural-hash.ts`](detectors/structural-hash.ts)       |
| C   | Layered            | Import fingerprint + body similarity scoring | [`detectors/layered.ts`](detectors/layered.ts)                       |

---

## CLI Usage

```bash
# Run all detectors
bun Tools/pattern-detector/index.ts <directory>

# Run specific detector
bun Tools/pattern-detector/index.ts <directory> --detector structural

# Adjust similarity threshold (Detector C)
bun Tools/pattern-detector/index.ts <directory> --detector layered --threshold 0.5

# JSON output
bun Tools/pattern-detector/index.ts <directory> --json
```

---

## File Structure

```
Tools/pattern-detector/
├── index.ts               # CLI entry point
├── parse.ts               # SWC AST parsing
├── types.ts               # Shared types
├── adapters.ts            # Detector adapter interface
├── format.ts              # Output formatting
├── similarity.ts          # Similarity scoring utilities
└── detectors/
    ├── import-fingerprint.ts   # Detector A
    ├── structural-hash.ts      # Detector B
    ├── layered.ts              # Detector C (entry)
    ├── layered-assembly.ts     # Cluster assembly
    ├── layered-clusters.ts     # Cluster merging
    └── layered-scoring.ts      # Similarity scoring
```

---

## Results (maple-hooks evaluation)

Source: [`docs/plans/2026-03-26-pattern-duplication-detector-design.md`](/Users/hogers/.claude/docs/plans/2026-03-26-pattern-duplication-detector-design.md)

| Detector               | Clusters | Avg Confidence | Precision |
| ---------------------- | -------- | -------------- | --------- |
| A (import fingerprint) | 128      | 35%            | Low       |
| B (structural hash)    | 47       | 100%           | High      |
| C (layered)            | 128      | 72%            | Medium    |

**Key finding:** Detector B is the most useful — 47 genuine clusters, zero false positives. Detectors A and C surface more candidates but require manual triage.
