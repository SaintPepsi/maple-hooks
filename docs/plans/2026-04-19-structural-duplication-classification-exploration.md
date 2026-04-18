# Structural Duplication Classification — Exploration Notes

**Status:** In progress, paused for later  
**Date:** 2026-04-19  
**Issue:** #251

## Goal

Reduce duplicated logic/code to make more elegant, concise, easily tested and maintained programs.

## What We've Figured Out

### 1. Not all structural duplication is bad

Some patterns are **idioms** (guard clauses should be duplicated everywhere), while others are **DRY violations** (business logic with same shape should be unified).

### 2. Build classification through supervised learning

- Start with everything "unclassified" and blocked by default
- Force the agent to present options to the user when detected
- User classifies as idiom or violation
- Build up a JSONL repository over time

### 3. Binary classification to start

Simple: `idiom` vs `violation`. Add nuance (scope, context-dependent) only if we hit concrete cases that need it.

### 4. Rich presentation for informed decisions

When prompting user for classification, show:
- Pattern name and description
- All matching locations
- Code snippets side-by-side
- Refactor preview (what the abstraction would look like)
- Agent recommendation

### 5. Minimal storage — only what drives behavior

From Echoes anti-rationalization analysis:
- Only store fields that change runtime behavior
- Timestamps, file paths, code hashes = noise (never queried, stale quickly)
- "For debugging/auditing" = YAGNI tells

### 6. Slugs not numbers

Pattern identifiers should be human-readable:
```json
{"pattern": "guard-clause", "class": "idiom"}
{"pattern": "result-ok-check-propagate", "class": "violation"}
```

## The Open Problem

**Pattern vs Instance classification:**

The same structural pattern can have instances that are idioms AND instances that are violations:

| Pattern | Instance | Classification |
|---------|----------|----------------|
| guard-clause | `if (!user) return null` | Idiom — generic null check |
| guard-clause | `if (!user.hasPermission('admin') && !user.isOwner(resource))` | Violation — if repeated 5 places |
| retry-with-backoff | Generic HTTP retry | Idiom |
| retry-with-backoff | Payment processor retry with specific error handling | Violation — if repeated |

**The question:** How do we distinguish these without:
1. Classifying at pattern level (too coarse — misses the distinction)
2. Classifying every instance (too fine — noise explosion)

### Options Under Consideration

**Option A: Pattern + Body Hash**
```json
{"pattern": "guard-clause", "body": "a1b2c3...", "class": "violation"}
```
Use the existing `body` signal from DuplicationChecker as semantic fingerprint.
- Pro: Leverages existing infrastructure
- Con: Exact hash is brittle (one char change = different hash)

**Option B: Pattern + Semantic Category**
```json
{"pattern": "guard-clause", "semantic": "permission-check", "class": "violation"}
{"pattern": "guard-clause", "semantic": "null-check", "class": "idiom"}
```
Human-defined semantic categories within each pattern.
- Pro: Stable, readable
- Con: Requires manual categorization, might miss cases

**Option C: Two-tier detection**
1. First pass: Structural pattern match (guard-clause detected)
2. Second pass: Are the BODIES of matched instances similar to each other?
   - If bodies differ → idiom (just structural similarity)
   - If bodies match → violation (semantic duplication)

No stored classification needed — computed at runtime.
- Pro: No repository maintenance
- Con: More complex detection logic

**Option D: Hybrid — default by pattern, override by fingerprint**
```json
{"pattern": "guard-clause", "default": "idiom"}
{"fingerprint": "guard-clause:a1b2c3", "class": "violation"}
```
Patterns have defaults, specific fingerprints can override.
- Pro: Handles both levels
- Con: Two lookup mechanisms

## Next Steps

1. Decide on the instance vs pattern classification approach
2. Update pattern catalog with slug identifiers
3. Design the detection → classification → action flow
4. Implement minimal prototype

## Related Files

- `structural-duplication-patterns/` — 100 pattern examples
- `hooks/DuplicationDetection/` — existing 4-signal checker
- First Principles + Council analysis earlier in this session
- Echoes anti-rationalization analysis (noise vs signal)

## Resume Point

Pick up at: "How do we distinguish idiom-instances from violation-instances within the same structural pattern?"

Consider starting with Option C (two-tier runtime detection) since it requires no stored state and aligns with YAGNI — only add storage if runtime detection isn't sufficient.
