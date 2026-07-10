# Structural Duplication Detection — Recommendations

**Date:** 2026-04-25
**Context:** Issue #251 — detect structural/pattern duplication beyond signature matches
**Research Source:** [fallow-rs/fallow](https://github.com/fallow-rs/fallow) (Rust clone detector with 8-34x performance over jscpd)

---

## Executive Summary

Our current 4-signal approach (hash, name, signature, body fingerprint) catches exact and near-exact duplicates ([REPORT.md:30](./REPORT.md)) but misses **structural duplication** — code following the same pattern with different concrete types. The `loadConfig()` pattern across 7 contracts exemplifies this: identical control flow, different type parameters ([Issue #251](https://github.com/anthropics/claude-maple-hooks/issues/251)).

Fallow-rs solves this with **progressive token normalization** ([fallow docs: detection modes](https://github.com/fallow-rs/fallow#detection-modes)) — a spectrum from exact matching to semantic matching where identifiers and literals are "blinded." We can adopt this technique without fallow's suffix-array complexity by extending our existing fingerprint approach ([parse.ts:47-58](./parse.ts)).

---

## What Fallow Does Well

*Source: [fallow-rs/fallow README](https://github.com/fallow-rs/fallow) and [source code](https://github.com/fallow-rs/fallow/tree/main/crates/fallow-core/src)*

### 1. Four Normalization Modes

| Mode | Identifiers | String Literals | Numeric Literals |
|------|-------------|-----------------|------------------|
| **Strict** | Preserved | Preserved | Preserved |
| **Mild** (default) | Preserved | Preserved | Preserved |
| **Weak** | Preserved | Blinded | Preserved |
| **Semantic** | Blinded | Blinded | Blinded |

In **semantic mode**, `loadConfig(): UserConfig` and `loadConfig(): SessionConfig` hash identically because type names and property names are normalized to placeholders.

### 2. AST-Based Tokenization

Fallow parses to AST, then extracts a normalized token stream. This naturally:
- Strips whitespace and comments
- Normalizes operator variants (+=, -= → assignment operators)
- Handles language-specific constructs uniformly

### 3. Clone Families & Refactoring Suggestions

Groups related duplicates by shared file sets, suggesting:
- "Extract function" for single-file duplicates
- "Extract module" for cross-file patterns
- "Mirrored directories" for parallel structure

### 4. Suffix Array + LCP Algorithm

O(N log N) detection across entire codebase in single pass. However, this is **overkill for our use case** — we check single files against an index, not full-codebase comparison.

---

## Gap Analysis: Current vs. Needed

| Capability | Current State | Needed for #251 |
|------------|---------------|-----------------|
| Exact body match | ✅ Hash signal | ✅ Sufficient |
| Name-based grouping | ✅ Name signal | ✅ Sufficient |
| Signature similarity | ✅ Sig signal | ⚠️ Too strict for structural |
| Body fingerprint | ✅ 16-node-type vector | ⚠️ Ignores identifier/literal normalization |
| Semantic equivalence | ❌ Not implemented | ✅ **The gap** |

**The core gap:** Our fingerprint captures AST node type distribution but preserves identifier distinctions. Two functions with identical control flow but different variable names produce different fingerprints.

---

## Recommendations

### Recommendation 1: Add Semantic Fingerprint Signal

Extend the existing fingerprint with a **normalized variant** that blinds identifiers and literals before hashing.

```typescript
// Current: bodyNodeTypes captures ["Identifier", "CallExpression", "StringLiteral", ...]
// Problem: Different identifier names → different hash

// Proposed: Add semanticFingerprint that normalizes before hashing
function buildSemanticFingerprint(body: BlockStatement): string {
  const normalized = JSON.stringify(body, (key, value) => {
    // Blind identifier names
    if (key === "value" && typeof value === "string") return "$ID";
    // Blind numeric literals
    if (key === "value" && typeof value === "number") return 0;
    // Blind string literals
    if (key === "raw" && typeof value === "string") return "$STR";
    // Preserve structure
    return value;
  });
  return hash(normalized);
}
```

**Effort:** Low — extend existing `normalizeForHash` function in `parse.ts`
**Impact:** High — directly addresses issue #251's loadConfig pattern

### Recommendation 2: Two-Phase Detection

Phase 1 (current): Fast 4-signal check using existing fingerprint
Phase 2 (new): Semantic fingerprint comparison for sig-matched groups

```
File written
    │
    ├── Hash match? → Block (exact duplicate)
    │
    ├── Name + Sig match? → Check body fingerprint
    │       │
    │       ├── Body 95%+ similar? → Block
    │       └── Body 70-95%? → Warn
    │
    └── Sig match only? → Check SEMANTIC fingerprint  ← NEW
            │
            ├── Semantic 95%+ similar? → Warn ("structural duplicate")
            └── Semantic <95%? → Pass
```

**Effort:** Medium — new signal in index, updated threshold logic
**Impact:** High — catches the loadConfig pattern at 95%+ semantic similarity

### Recommendation 3: Pattern Library (Long-term)

Catalog known structural patterns (like fallow's clone families) with refactoring suggestions:

```typescript
const KNOWN_PATTERNS = {
  "config-3-layer-merge": {
    signature: "spread → read config.json → parse → merge hookConfig → return",
    suggestion: "Use loadHookConfig() from lib/hook-config.ts",
    files: ["ArticleWriter", "SessionAutoRename", ...],
  },
  "test-factory-pair": {
    signature: "makeDeps() + makeInput() in test file",
    suggestion: "Consider test scaffold generator",
    files: 26,
  },
};
```

**Effort:** High — requires pattern extraction and matching engine
**Impact:** Medium — actionable suggestions vs. generic warnings

### Recommendation 4: Do NOT Adopt Suffix Array

Fallow's suffix array approach is optimized for **full-codebase scans**, not **incremental single-file checks**. Our architecture already solves this differently:

| Fallow | maple-hooks |
|--------|-------------|
| Full scan at runtime | Pre-built index at session start |
| Suffix array + LCP | Hash table lookups |
| O(N log N) full corpus | O(1) per-function lookup |

Keep our indexed approach. The semantic fingerprint recommendation extends it without architectural changes.

---

## Implementation Priority

| Priority | Recommendation | Effort | Impact | Addresses #251? |
|----------|----------------|--------|--------|-----------------|
| **P0** | Semantic fingerprint signal | Low | High | ✅ Directly |
| **P1** | Two-phase detection with thresholds | Medium | High | ✅ Directly |
| **P2** | Renamed identifier mapping (like fallow's "Renamed" output) | Medium | Medium | Partially |
| **P3** | Pattern library | High | Medium | Indirectly |

---

## Open Questions for Council

1. **Threshold tuning:** What semantic similarity % should trigger warnings vs. blocks? 95%? 90%?

2. **Index size impact:** Semantic fingerprints add ~16 bytes per function. With 1817 functions, that's ~29KB — acceptable?

3. **False positive risk:** Semantic normalization might over-match genuinely different functions that happen to share control flow. How aggressive should we be?

4. **Identifier mapping:** Should we show "Renamed" output like fallow, mapping variable names between duplicates? Adds context but increases complexity.

5. **Existing refactoring debt:** The loadConfig pattern already exists in 7 contracts. Should detecting it trigger immediate cleanup, or just prevent new instances?

---

## Conclusion

Fallow demonstrates that progressive normalization is the key to structural duplication detection. We can adopt this technique at the fingerprint level without adopting fallow's suffix-array architecture — our indexed approach is already optimized for incremental checks.

**Recommended path:** Implement semantic fingerprint (P0) → two-phase detection (P1) → evaluate pattern library need (P3) based on false positive rates.
