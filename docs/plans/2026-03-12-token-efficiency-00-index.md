# Token Efficiency Implementation Plans — Index

**Created:** 2026-03-12
**Context:** Analysis of 7,200 Opus calls, 639 Haiku calls, and 240 Sonnet calls over March 5-12, 2026. Total estimated API-equivalent cost: $672-798/week. Rate limit utilization: 48% of 7-day, 100% of extra credits.

**Design principle:** Maintain Algorithm depth and thoroughness. Ian prefers fewer, deeper sessions over many shallow ones. These plans reduce mechanical overhead and per-turn cost without reducing analytical depth.

---

## Plans by Priority

| # | Plan | Est. Savings/Week | Difficulty | File |
|---|------|-------------------|------------|------|
| 1 | **Shrink System Prompt** | $63 cache reads | Medium | `01-shrink-system-prompt.md` |
| 2 | **Reduce Ceremony Turns** | $43 cache reads | Medium | `02-reduce-ceremony-turns.md` |
| 3 | **Session Length Management** | $132 cache reads | Low-Medium | `03-session-length-management.md` |
| 4 | **Sonnet Delegation** | $42 rate limit | Low | `04-sonnet-delegation.md` |
| 5 | **Hook Model Optimization** | $1.70 | Low | `05-hook-model-optimization.md` |

**Combined estimated savings: ~$282/week, ~$1,208/month**

---

## Recommended Execution Order

### Phase A: Quick Wins (1-2 hours)
1. **Plan 3, Task 1:** Earlier compaction threshold — text edit to Algorithm, biggest single lever ($77/week)
2. **Plan 1, Task 1:** Deduplicate Algorithm from SKILL.md ($29/week)
3. **Plan 5, Task 1:** DocCrossRef → Haiku — one-line change ($1/week)

### Phase B: System Prompt Diet (2-3 hours)
4. **Plan 1, Task 2:** Compress steering rules ($11/week)
5. **Plan 1, Task 3:** Trim skill descriptions ($9/week)
6. **Plan 1, Task 4:** Lazy-load coding standards ($14/week)

### Phase C: Algorithm Tuning (2-3 hours)
7. **Plan 2, Task 1:** Batch voice curls ($15/week)
8. **Plan 2, Task 2:** Consolidate PRD updates ($10/week)
9. **Plan 2, Task 3:** Parallel tool calls ($6/week)
10. **Plan 2, Task 4:** Skip DISCOVER on continuation ($12/week)

### Phase D: Delegation (1 hour)
11. **Plan 4, Task 1:** Sonnet delegation for BUILD/EXECUTE ($42/week)

### Phase E: Cleanup (30 min)
12. **Plan 5, Tasks 2-3:** Hook debounce and path filtering ($0.70/week)
13. **Plan 3, Tasks 2-3:** Session rotation advisory and state dump ($55/week)

---

## Measurement

After each phase, start a fresh session and:
1. Run `/context` — record token count
2. Run a Standard-tier Algorithm task — count total API turns
3. Compare to baseline: 53k startup tokens, 167 avg calls/session

**Target:**
- System prompt: 53k → 30-35k
- Avg calls/session: 167 → 120-130
- Weekly cache read tokens: 698M → 400-500M
