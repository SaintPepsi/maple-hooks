# Pattern Duplication Detector — Work Log

Ongoing exploration of structural pattern detection approaches. Each cycle produces a new approach in its own file.

## Baseline (2026-03-27)

Initial spike with three detectors against maple-hooks (214 files, 837 functions):

- **Detector A** (import fingerprint): 128 clusters, avg confidence 35% — too noisy
- **Detector B** (structural hash): 47 clusters, confidence 100% — high precision, catches exact duplicates only
- **Detector C** (layered import + body similarity): 128 clusters, avg confidence 72% — better ranking, same noise

**Key gap:** 715 of 837 functions uncovered. Functions following the same template (adapter pattern, test helper pattern, hook contract pattern) differ structurally and escape all three detectors.

---

## Cycle 1: N-gram AST Subsequence Detection (2026-03-27 07:40)

**Hypothesis:** Sliding windows of N consecutive AST node types reveal shared sub-patterns even when full structures differ. Functions following the same template (e.g., "check existence, perform op, wrap in Result") will share characteristic n-grams.

**Approach:**

1. For each function, extract the sequence of AST node types from bodyNodeTypes
2. Generate all n-grams (default n=4) from the sequence
3. Build an inverted index: n-gram -> list of functions containing it
4. Find n-grams that appear in 3+ functions across 2+ files (unusual shared patterns)
5. Score function pairs by shared n-gram count / total n-grams (Jaccard similarity)
6. Cluster functions above threshold

**File:** `Tools/pattern-detector/variants/ngram-subsequence.ts`

**Expected advantage over existing detectors:** Catches template-following code where the overall structure differs but key subsequences match. Should find the adapter pattern (readFile/writeFile/deleteFile all doing check-op-wrap).

**Results:**

| N   | Shared n-grams | Pairs | Clusters | Time  |
| --- | -------------- | ----- | -------- | ----- |
| 3   | 1,014          | 6,776 | 22       | 382ms |
| 4   | 1,856          | 3,083 | 73       | 311ms |
| 5   | 2,644          | 1,846 | 90       | 279ms |
| 6   | 3,251          | 1,304 | 94       | 270ms |
| 8   | 3,573          | 834   | 80       | 257ms |

**Sweet spot:** N=5 or N=6 — more clusters than N=4 with fewer noisy pairs.

**Key findings (N=4, threshold 0.3):**

- 73 clusters (vs 47 from structural hash) — catches 55% more patterns
- **17-member cluster:** `getFilePath`/`getCommand`/`getWriteContent` across hook contracts — the input extraction pattern duplicated in every contract
- **13-member cluster:** `runHook` test helpers across 12 test files — identical test runner setup
- **10-member cluster:** `makeSourceRepo`/`makeMultiHookRepo` test fixture factories
- **6-member cluster:** `buildBlockMessage`/`buildBlockLimitReview` across obligation state machines
- **5-member cluster:** Identity accessors (`getDAName`, `getPrincipalName`, etc.) — identical accessor pattern

**Verdict:** Significantly better than structural hash for template detection. The top n-grams (`CallExpression→MemberExpression→Identifier→Identifier`) are too generic, but the Jaccard clustering filters them effectively. N=5-6 looks optimal for next iteration.

**What it still misses:** Semantic equivalence with different control flow (e.g., early return vs late return doing the same thing).

---

## Cycle 2: Control Flow Graph Skeleton Fingerprinting (2026-03-27 08:00)

**Hypothesis:** Many duplicated patterns share the same control flow skeleton (sequence of branches, loops, returns) even when their expressions differ entirely. A function that does `if → early return → try → catch → return` will have the same skeleton whether it's processing files, regex, or YAML.

**Approach:**

1. Extract only control flow node types (IfStatement, ForStatement, ReturnStatement, TryStatement, etc.) from bodyNodeTypes
2. Track nesting depth from BlockStatement entries
3. Generate four fingerprint variants:
   - **Full skeleton:** type@depth sequence (exact flow + nesting)
   - **Compressed:** type sequence only (ignoring depth)
   - **Shape:** unique (type, depth) pairs, unordered (what constructs at what depths)
   - **Abbreviated:** consecutive same-type nodes collapsed (if(2)→return)
4. Group functions by fingerprint, require 2+ files per cluster

**File:** `Tools/pattern-detector/variants/cfg-skeleton.ts`

**Expected advantage:** Catches the "safe wrapper" pattern (try→return→catch→return) across different adapter implementations. Higher precision than n-gram since it ignores expression noise entirely.

**Results:**

| Strategy      | Clusters (min-depth 1) | Clusters (min-depth 0) |
| ------------- | ---------------------- | ---------------------- |
| Full skeleton | 3                      | 34                     |
| Compressed    | 3                      | 34                     |
| Shape         | 3                      | 35                     |
| Abbreviated   | 3                      | 34                     |
| **Total**     | **12**                 | **137**                |

**Key findings (min-depth 1):**

- **10-member cluster:** `TryStatement→ReturnStatement→CatchClause→ReturnStatement` — the canonical safe wrapper pattern across `regex.ts`, `yaml.ts`, `result.ts`, stub adapters
- **7-member shape cluster:** `try→return→catch→if→return` — the "read state, validate, return" pattern across `algorithm-state.ts`, `change-detection.ts`, `notifications.ts`, `tab-setter.ts`
- **4-member shape cluster:** `return→if→try→catch→if→return` — the "early guard, try operation, check result" pattern in `process.ts`, `identity.ts`, `notifications.ts`, `tab-setter.ts`

**Verdict:** Very high precision — every cluster is a genuine pattern match. But low recall (12 clusters at depth 1) because:

1. Skeleton extraction from flat node type list loses real nesting information
2. Most functions have short skeletons (avg 4.1 nodes) so many match trivially
3. The depth filter aggressively reduces matches

**Shape fingerprint is the best strategy** — it found 3 unique clusters that the others missed by being order-independent.

**What it still misses:** Functions that follow the same template but with different numbers of branches (e.g., 2 if-checks vs 3 if-checks in an adapter).

**SUPERSEDED (2026-03-27):** This approach is not used in the production hooks. The body fingerprint (16-element AST node type frequency vector with cosine similarity) subsumes the CFG skeleton signal with better granularity — it captures control flow node frequencies as part of a continuous similarity score rather than binary skeleton matching. CFG skeleton's unique contribution (order-sensitivity) didn't surface findings the other signals missed in practice. Its value was as a research stepping stone toward the fingerprint design.

---

## Cycle 3: Role-Based Name Clustering with Structural Validation (2026-03-27 08:25)

**Problem explored:** Ran existing detectors and analyzed what they miss. Found that **44 `makeDeps` functions across 44 files** are invisible to all detectors because each constructs different Deps objects. Similarly, 31 `makeInput` functions, 12 `getFilePath` functions. The signal is in the name — it encodes the architectural role — but no detector uses it.

**Hypothesis:** Function names encode architectural roles (factory, accessor, validator, formatter). Grouping by name, then validating with structural body similarity, should find genuine role-based duplication while filtering coincidental name collisions.

**Approach:**

1. **Exact name clustering:** Group functions by exact name across files, compute avg pairwise body similarity
2. **Role clustering:** Normalize names (strip prefixes like `make`/`get`/`is`, suffixes like `Safe`/`Async`) to extract the "role," then group. This catches variants: `ensureDir` + `ensureDirSafe`, `isTestFile` + `hasTestFile`
3. **Verb classification:** Classify each function's architectural role (factory/accessor/predicate/formatter/parser/handler/validator) and show distribution
4. **Structural validation:** Flag clusters where avg body similarity > 30% as "validated" (genuine pattern) vs "name-only" (coincidence)

**File:** `Tools/pattern-detector/variants/role-naming.ts`

**Results:**

| Metric                 | Value        |
| ---------------------- | ------------ |
| Exact name clusters    | 25           |
| Role clusters          | 31           |
| Structurally validated | 25/25 (100%) |
| Detection time         | 7ms          |

**Top findings:**

| Function         | Instances | Files | Body Sim | Verb     |
| ---------------- | --------- | ----- | -------- | -------- |
| `makeDeps`       | 44        | 44    | 75%      | factory  |
| `makeInput`      | 31        | 31    | 95%      | factory  |
| `runHook`        | 13        | 13    | 93%      | other    |
| `getFilePath`    | 12        | 12    | 99%      | accessor |
| `run`            | 9         | 9     | 77%      | other    |
| `getStateDir`    | 7         | 7     | 88%      | accessor |
| `blockCountPath` | 6         | 6     | 100%     | other    |

**Verb distribution:**

- **Factories** (make/create/build): 177 total, 98 clustered (55%) — the most duplicated role
- **Accessors** (get/read/load): 128 total, 24 clustered (19%)
- **Other** (domain-specific names): 364 total, 53 clustered (15%)
- **Predicates** (is/has/can): 71 total, 4 clustered (6%)

**Role clustering adds value over exact name:** Found `ensureDir` + `ensureDirSafe` (4 instances, 69% sim), `readFile` + `readFileSafe` (3 instances, 72% sim), `isTestFile` + `hasTestFile` (4 instances, 86% sim), `formatBlockMessage` + `buildBlockMessage` (4 instances, 74% sim).

**Verdict:** The most actionable detector yet. Every cluster represents a real refactoring opportunity. The 44 `makeDeps` and 31 `makeInput` factories are the largest DRY wins. This approach is complementary to the structural detectors — it finds patterns they fundamentally cannot because the signal is semantic (naming), not structural (AST).

**What it still misses:** Functions that serve the same role but have completely different names (e.g., `processEvent` and `handleNotification` doing the same thing). Also misses duplicated logic that isn't in a function at all (inline patterns in long function bodies).

---

## Cycle 4: File-Level Template Detection (2026-03-27 08:55)

**Problem explored:** All prior detectors work at function-level. Ran analysis of file-level patterns and found **21 test files** export the exact same function set `{makeDeps, makeInput}` and **12 test files** export `{runHook}`. These are copy-pasted file templates where every prior detector only catches individual functions, missing that the entire file is a duplicate.

Also found: `DocObligationStateMachine.shared.ts` and its tracker counterpart share 11 functions with 99% similarity — practically the same file. Same for `TestObligationStateMachine.shared.ts`.

**Hypothesis:** Fingerprinting files by their exported function "interface" (sorted set of function names) detects whole-file template duplication. Fuzzy matching (Jaccard on function names + body similarity) catches adapted templates where a few functions were added/removed.

**Approach:**

1. **File interface fingerprinting:** For each file, build sorted list of function names as a fingerprint
2. **Exact template clustering:** Group files with identical fingerprints
3. **Fuzzy template matching:** For file pairs in the same category (test/contract/etc), compute Jaccard similarity on function names + avg body similarity on shared functions
4. **File category analysis:** Categorize files (test/contract/adapter/handler/lib) and show which categories are most template-heavy

**File:** `Tools/pattern-detector/variants/file-template.ts`

**Results:**

| Metric                       | Value          |
| ---------------------------- | -------------- |
| Exact template clusters      | 13             |
| Fuzzy matches (>50% overlap) | 94             |
| Files in templates           | 65 / 214 (30%) |
| Detection time               | 6ms            |

**Top exact templates:**

| Template                | Files | Avg Sim | Category |
| ----------------------- | ----- | ------- | -------- |
| `{makeDeps, makeInput}` | 21    | 90%     | test     |
| `{runHook}`             | 12    | 100%    | test     |
| `{makeDeps}`            | 9     | 93%     | test     |
| `{execute}`             | 5     | 96%     | fixture  |
| `{readStdin}`           | 2     | 93%     | other    |

**Category breakdown:** 62% of test files follow a template. 0% of contracts or adapters have exact-match templates (they share functions but not identical sets).

**Top fuzzy matches:**

- `CitationEnforcement.shared.ts` ↔ `CitationTracker/CitationEnforcement.ts`: 83% name overlap, 96% body sim — practically the same file
- `CodingStandardsAdvisor.test.ts` ↔ `CodingStandardsEnforcer.test.ts`: 80% name overlap, 98% body sim
- `DocObligationStateMachine.shared.ts` ↔ tracker: 11 shared functions, 99% body sim

**Verdict:** This is the first detector that operates at file granularity. It reveals that the test suite is heavily templated — 62% of test files follow one of 8 templates. The fuzzy matching catches near-identical file pairs (shared.ts ↔ tracker/\*.ts) that exact matching misses. Combined with cycle 3's role-based naming, this gives a complete picture: "these files are copies of each other, and here are the specific functions that are duplicated."

**What it still misses:** Template patterns within contract files (they share individual functions but have different function sets). A "partial template" detector that finds the largest common function subset between files would catch this.

---

## Cycle 5: Type-Signature-Gated Similarity Clustering (2026-03-27 09:20)

**Problem explored:** Ran analysis of what all 4 prior detectors collectively miss. Found that **57 adapter functions** (`readFile`, `readDir`, `ensureDir`, `deleteFile`, `removeDir`, `stat`) share the type signature `(string) → Result` and have 77% body similarity, but have different names, different imports, and different-enough structure to escape every detector. The type signature is the only consistent signal.

**Hypothesis:** Type signatures are a cheap pre-filter (O(1) grouping) that gates expensive body similarity computation. Functions doing the same thing to the same types will cluster together regardless of naming, imports, or minor structural differences.

**Approach:**

1. Extract type signature per function: `(paramType1, paramType2) → returnType`
2. Group by exact signature fingerprint
3. Within each group, compute pairwise body similarity (sampled for large groups)
4. Union-find clustering from pairs above similarity threshold
5. **Novelty analysis:** Flag "name-diverse" clusters (2+ distinct function names) — these are invisible to role-naming detectors

**File:** `Tools/pattern-detector/variants/type-signature.ts`

**Results:**

| Metric                             | Value         |
| ---------------------------------- | ------------- |
| Signature groups (3+ members)      | 45            |
| Similarity clusters                | 47            |
| Name-diverse clusters              | 46 / 47 (98%) |
| Functions in name-diverse clusters | 708           |
| Detection time                     | 43ms          |

**Top name-diverse clusters (what no other detector finds):**

| Signature                | Functions | Files | Body Sim | Example Names                                          |
| ------------------------ | --------- | ----- | -------- | ------------------------------------------------------ |
| `(string)→Result`        | 57        | 27    | 74%      | readFile, removeDir, hookNotFound, stat                |
| `(string)→string`        | 68        | 42    | 70%      | removeDirRecursive, flagKey, countNullReturns          |
| `()→string`              | 42        | 20    | 72%      | cwd, setupPaiDir, getStateDir, isInCooldown            |
| `(Ref)→Union`            | 21        | 16    | 85%      | getFilePath, getWriteContent, getEditParts, getCommand |
| `(string,?)→Result`      | 19        | 15    | 84%      | exec, safeFetch, makeInput, makeToolInput              |
| `(string,string)→Result` | 29        | 14    | 79%      | writeFile, makeHookDef, manifestSchemaInvalid          |

**Key finding: The `(TsTypeReference)→TsUnionType` cluster** at 85% similarity unifies `getFilePath`, `getWriteContent`, `getEditParts`, `getCommand`, and `getNewContent` across 16 files — all hook contract input extractors following the same pattern. Prior detectors caught fragments of this; type signatures unify it.

**Verdict:** The highest-coverage detector. 708 functions in name-diverse clusters covers 85% of the codebase. The type signature pre-filter makes body similarity computation cheap (43ms total). The novelty analysis proves these clusters are genuinely invisible to name-based approaches — 98% of clusters have 2+ distinct names.

**What it still misses:** Functions with `unknown`/`any` type annotations (no signal). Functions with identical signatures doing completely different things (false positives in the huge `(string)→string` cluster). The precision/recall tradeoff tilts toward recall at the cost of some noise in large signature groups.

**Cumulative detector comparison:**

| Detector                     | Clusters | Key Strength                   | Key Weakness                     |
| ---------------------------- | -------- | ------------------------------ | -------------------------------- |
| Structural hash (baseline)   | 47       | Zero false positives           | Exact matches only               |
| N-gram subsequence (cycle 1) | 73-94    | Template patterns              | Generic n-grams noisy            |
| CFG skeleton (cycle 2)       | 12-137   | Control flow patterns          | Low recall at high precision     |
| Role naming (cycle 3)        | 25       | Actionable refactoring targets | Misses different-name duplicates |
| File template (cycle 4)      | 13+94    | Whole-file duplication         | Only catches file-level patterns |
| Type signature (cycle 5)     | 47       | Highest coverage (708 fns)     | Some noise in large groups       |

---

## Cycle 6: Composite Multi-Signal Ranker (2026-03-27 09:45) — THE PRODUCTION ENGINE

**Problem explored:** Analyzed coverage across all 5 detectors. Found 733 of 837 functions (88%) hit at least one detection signal, but no unified view exists. 69 functions hit ALL 4 dimensions (hash + name + signature + body) — the highest-confidence targets. Without a combined ranking, an engineer has to mentally merge 5 different outputs.

**Hypothesis:** Scoring every function across 4 detection dimensions (structural hash, name repetition, type signature commonality, body similarity) and ranking by composite score produces an actionable "top DRY opportunities" list that no individual detector can.

**Approach:**

1. **4 signal extractors run in parallel:** hash (exact match), name (same-name count), signature (shared type sig), body (cross-sig similarity)
2. **Weighted composite score:** hash=1.0, body=0.8, name=0.7, signature=0.4
3. **Opportunity grouping:** Functions grouped by name, ranked by avg dimension count then avg score
4. **Visual indicators:** `●●●●` = 4 dimensions lit, per-signal percentages, estimated AST node savings

**File:** `Tools/pattern-detector/variants/composite-ranker.ts`

**Results:**

| Metric                    | Value           |
| ------------------------- | --------------- |
| Functions with any signal | 733 / 837 (88%) |
| 4-dimension functions     | 69              |
| 3-dimension functions     | 145             |
| 2-dimension functions     | 387             |
| 1-dimension functions     | 132             |
| Refactoring opportunities | 71              |
| Detection time            | 38ms            |

**Top 10 opportunities (all 4 dimensions):**

| Rank | Name             | Instances | Files | Avg Score | Est. Savings |
| ---- | ---------------- | --------- | ----- | --------- | ------------ |
| #1   | `runHook`        | 13        | 13    | 2.70      | ~441 nodes   |
| #2   | `getFilePath`    | 12        | 12    | 2.57      | ~100 nodes   |
| #3   | `blockCountPath` | 6         | 6     | 2.62      | ~13 nodes    |
| #4   | `pendingPath`    | 4         | 4     | 2.48      | ~8 nodes     |
| #5   | `makeToolInput`  | 4         | 4     | 2.46      | ~11 nodes    |
| #6   | `getCommand`     | 5         | 5     | 2.31      | ~33 nodes    |
| #7   | `makeSourceRepo` | 5         | 5     | 2.31      | ~120 nodes   |
| #16  | `makeInput`      | 31        | 31    | 2.01      | ~111 nodes   |
| #28  | `run`            | 9         | 9     | 1.35      | ~489 nodes   |

**Key insight:** The composite ranking surfaces `runHook` (13 instances, all 4 signals at 100%) as the #1 opportunity over `makeDeps` (44 instances but lower dimensional coverage). Pure instance count is misleading — dimensional convergence is a better proxy for "this should definitely be refactored."

**Verdict: THIS IS THE ONE.** This is the culmination of cycles 1-5 and the core logic that powers the production DuplicationChecker hook. Each individual detector found a different facet of duplication. The composite ranker fuses them into a single actionable report. Its threshold logic (4/4 dimensions + hash 100% = BLOCK, 3/4 = SUGGEST, <3 = SILENT) is the exact decision logic running in the production hook on every Write/Edit to .ts files. The 4-dimension `●●●●` functions (69 total) are near-certain refactoring targets. The 3-dimension `●●●○` functions (145 total) are strong candidates. Together they cover 26% of all functions.

**What remains:** This is a solid stopping point for the exploration spike. The six approaches cover the detection space well:

- **Exact match:** structural hash
- **Approximate match:** n-gram, CFG skeleton, body similarity
- **Semantic match:** role naming, type signature
- **Composite:** multi-signal ranker
  A production tool would combine the composite ranker with a hook that runs on file save, flagging new code that matches existing patterns.

---

## Cycle 7: Persistent Index Builder + Single-File Checker (2026-03-27 10:15)

**Problem explored:** Every variant parses all 214 files from scratch (200ms) on every run. A council debate concluded the production architecture needs a background-built persistent index with O(1) lookups and mandatory staleness signaling. No variant produces a persistent index — that's the bridge from spike to production.

**Hypothesis:** A pre-built JSON index (~166KB) with per-function entries (hash, name, type signature, condensed body fingerprint) enables single-file checks in <5ms. The body fingerprint condenses the full node type list (avg 69 items) into a 32-char hex frequency vector of the top-16 AST node types, enabling approximate cosine similarity without storing the full list.

**Approach:**

1. **Index builder:** Parses all files, extracts per-function data, builds lookup maps (hash groups, name groups, signature groups), writes JSON
2. **Single-file checker:** Loads the index (1ms), parses one file, checks each function against 3 signals: hash match, name match, fingerprint similarity within signature groups
3. **Staleness signaling:** Index carries `builtAt` timestamp. If index is >5 minutes old, output prefixed with `stale:`
4. **Condensed fingerprint:** Top-16 AST node type frequency vector encoded as 32-char hex. Enables cosine similarity in O(1) without full body node types.

**File:** `Tools/pattern-detector/variants/index-builder.ts`

**Results:**

| Metric                 | Value  |
| ---------------------- | ------ |
| Index build time       | 215ms  |
| Index size             | 166KB  |
| Index load time        | 1ms    |
| Single-file check time | 3-17ms |
| Hash groups            | 47     |
| Name groups            | 71     |
| Signature groups       | 44     |

**Check results on known duplicates:**

- `CodingStandardsEnforcer.contract.ts` → found `getFilePath` hash match + 4 fingerprint matches in **3ms**
- `SecurityValidator.hook.test.ts` → found `runHook` hash match in **17ms**
- Output format: `[●●○○] getFilePath:54 → CodingStandardsAdvisor.contract.ts:getFilePath:118 (hash:100%)`

**Verdict:** This is the production bridge. The index format is compact (166KB), loads instantly (1ms), and checks are fast enough for a PostToolUse hook (<20ms). The staleness contract is built in. The condensed body fingerprint trades some precision for 6x size reduction (1MB → 166KB) while still enabling approximate similarity.

**What remains for production:**

- Background index rebuilder (cron or file-watcher triggered)
- Hook contract wrapping the checker as a PostToolUse:Write hook
- Threshold tuning for the fingerprint similarity signal
- Integration with the maple-hooks HookContract pattern

---

## Cycle 8: Function Co-occurrence Mining (2026-03-27 10:40)

**Problem explored:** All 7 prior detectors analyze individual functions. But duplication often manifests as GROUPS of functions that appear together — template tuples. Explored co-occurrence patterns and found `{makeDeps, makeInput}` in 26 files, `{getFilePath, getStateDir}` in 6 files, and a 6-function tuple across 4 obligation state machine files. No prior detector captures this "functions that travel together" signal.

**Hypothesis:** Frequent itemset mining on function name sets per file, expanded via Apriori-like tuple growth, reveals template patterns that individual function analysis misses. Structural validation separates genuine templates from coincidental co-occurrence.

**Approach:**

1. **Frequent pair mining:** Count all function name pairs that co-occur in 3+ files
2. **Apriori expansion:** Grow pairs into larger tuples by finding names that co-occur with ALL members of existing tuples
3. **Template validation:** Compute avg pairwise body similarity for each function name across the tuple's files. >50% = genuine template.
4. **Maximal filtering:** Remove tuples that are strict subsets of larger tuples with the same support

**File:** `Tools/pattern-detector/variants/cooccurrence.ts`

**Results:**

| Metric         | Value |
| -------------- | ----- |
| Frequent pairs | 17    |
| Total tuples   | 59    |
| Maximal tuples | 5     |
| Detection time | 10ms  |

**All 5 maximal tuples are validated templates:**

| Tuple                                                                                               | Support  | Body Sim | Description                   |
| --------------------------------------------------------------------------------------------------- | -------- | -------- | ----------------------------- |
| `{blockCountPath, buildBlockLimitReview, getFilePath, getStateDir, isNonTestCodeFile, pendingPath}` | 4 files  | 97%      | Obligation state machine core |
| `{makeDeps, makeInput}`                                                                             | 26 files | 85%      | Test file template            |
| `{getFilePath, getStateDir}`                                                                        | 6 files  | 94%      | Hook contract accessor pair   |
| `{blockCountPath, getStateDir}`                                                                     | 5 files  | 94%      | Obligation state path pair    |
| `{formatDryRun, formatSuccess}`                                                                     | 3 files  | 82%      | CLI command output pair       |

**Key finding:** The 6-tuple across obligation state machines (97% body sim) is the strongest "extract a shared module" signal we've produced. These 6 functions are replicated across 4 files with near-identical implementations — they should be imported from a single shared utility.

**Verdict:** Co-occurrence mining is the complement to individual function analysis. It answers "what functions TRAVEL TOGETHER?" rather than "what functions LOOK ALIKE?" The Apriori expansion from pairs to larger tuples naturally discovers the template structure without being told what to look for. Zero false positives — all 5 maximal tuples are validated templates.

**Cumulative detector inventory (8 cycles):**

| Cycle | Detector           | Signal                            | Key Finding                               |
| ----- | ------------------ | --------------------------------- | ----------------------------------------- |
| 0     | Structural hash    | Exact body match                  | 47 exact duplicates                       |
| 1     | N-gram subsequence | AST subsequence patterns          | 73 template clusters                      |
| 2     | CFG skeleton       | Control flow structure            | 12 flow-pattern clusters                  |
| 3     | Role naming        | Function name semantics           | 44 makeDeps factories                     |
| 4     | File template      | File-level function sets          | 21-file test template                     |
| 5     | Type signature     | Type-gated body similarity        | 708 functions in name-diverse clusters    |
| 6     | Composite ranker   | Multi-signal ranking              | 71 ranked opportunities                   |
| 7     | Persistent index   | O(1) lookups from pre-built index | 3ms per-file checks                       |
| 8     | Co-occurrence      | Function tuple mining             | 6-function obligation template at 97% sim |

---

## Cycle 9: Exploration Complete — Final Report (2026-03-27 11:10)

**Problem explored:** Checked whether any genuinely unexplored detection dimension remains. Analyzed signal overlap: hash, name, and type signature union covers 82% of functions (688/837). The remaining 149 functions (18%) are genuinely unique — no duplication to detect.

**Remaining unexplored signals and why they're blocked:**

- Call graph: bodyNodeTypes has node types not identifier values — callee names are lost during parsing
- Comment/doc patterns: stripped during AST parse
- Variable naming: stripped during normalization

**Conclusion:** The detection spike is complete. 9 approaches explored, 3 core signals identified (hash + name + type signature), composite ranking and persistent index built. Moving to hook implementation phase.

**Full report:** `Tools/pattern-detector/REPORT.md`

---

# Hook Implementation Phase

## Implementation Cycle 1: DuplicationChecker Hook (2026-03-27 11:30)

**What was built:**

- `maple-hooks/hooks/DuplicationDetection/shared.ts` — index types, loading/caching, checking logic, output formatting (SOLID 8.5/10)
- `maple-hooks/hooks/DuplicationDetection/parser.ts` — SWC function extraction + body fingerprinting (SOLID 8.8/10)
- `maple-hooks/hooks/DuplicationDetection/DuplicationChecker/DuplicationChecker.contract.ts` — thin PreToolUse contract shell (SOLID 9/10)
- `maple-hooks/hooks/DuplicationDetection/DuplicationChecker/DuplicationChecker.hook.ts` — runner shell
- `maple-hooks/hooks/DuplicationDetection/DuplicationChecker/hook.json` — manifest
- `maple-hooks/hooks/DuplicationDetection/DuplicationChecker/settings.hooks.json` — hook registration

**Architecture:** Contract imports from shared.ts (index + checking) and parser.ts (SWC extraction). Three files, clean separation of concerns.

**End-to-end test results:**

- Writing content from `RatingCapture.hook.test.ts` → detected `runHook` duplication: `Similar: runHook → hooks/LearningFeedback/RatingCapture/RatingCapture.hook.test.ts:runHook (hash+name+sig+body, 100%)`
- Writing content from `CodingStandardsAdvisor.contract.ts` → detected `getFilePath` duplication: `Similar: getFilePath → hooks/CodingStandards/CodingStandardsAdvisor/CodingStandardsAdvisor.contract.ts:getFilePath (hash+name+sig+body, 100%)`
- Writing genuinely unique content → clean, no output

**What works:**

- PreToolUse fires on Write/Edit to .ts files
- Loads and caches the pre-built index (1ms)
- Extracts functions from content being written
- Checks across 4 signals, only surfaces findings at 3+ dimensions
- Single-line output, concise enough for AI context
- Staleness prefix when index is old

**Next cycle:**

- Write and run contract tests
- Build the index at session start (DuplicationIndexBuilder hook or simpler mechanism)
- Install the hook and test in a real session
