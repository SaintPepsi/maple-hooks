# Plan 5: Hook Model Optimization

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Optimize the model selection and invocation frequency of hook-spawned inference sessions. Current cost is only $2.87/week so this is low-priority, but it reduces unnecessary session overhead and rate limit consumption.

**Why this matters:** 442 hook-spawned sessions/week create 442 session JSONL files, each consuming disk space and contributing to the 2,297 total sessions. While the token cost is negligible, the rate limit impact of 879 API calls (639 Haiku + 240 Sonnet) adds up, and the session file bloat (322 + 120 files/week) makes analysis harder.

**Constraint:** Hook functionality must be preserved. SessionAutoName, RatingCapture, and DocCrossRefIntegrity all serve real purposes.

---

## Task 1: Downgrade DocCrossRefIntegrity from Sonnet to Haiku

**Savings:** ~$1/week in direct cost, rate limit reduction
**Risk:** Low — the task is classification (are docs in sync?) not generation

**Files:**
- Edit: `~/.claude/hooks/handlers/DocCrossRefIntegrity.ts`

**Steps:**
1. Read the current inference call at line ~566
2. Change `level: 'standard'` (Sonnet) to `level: 'fast'` (Haiku)
3. The task is detecting semantic drift between docs and code — Haiku handles this well
4. If accuracy drops noticeably, revert. But classification tasks are Haiku's strong suit.

**Verification:**
- DocCrossRefIntegrity still catches real doc/code drift
- New sessions use Haiku instead of Sonnet
- Test with a known doc inconsistency to verify detection still works

---

## Task 2: Debounce SessionAutoName

**Savings:** Reduces redundant Haiku sessions
**Risk:** Low

**Files:**
- Edit: `~/.claude/hooks/contracts/SessionAutoName.ts`

**Steps:**
1. Currently SessionAutoName fires on every UserPromptSubmit
2. It should only fire once per session — on the first prompt
3. Check if it already has session-uniqueness logic (likely yes, based on the "first prompt" description in comments)
4. If not, add a check: read the session file, if it already has a name field, skip inference
5. This may already be handled — verify before changing

**Verification:**
- Session naming still works for new sessions
- No duplicate naming calls within a single session

---

## Task 3: Conditional DocCrossRefIntegrity Firing

**Savings:** Reduces unnecessary Sonnet/Haiku sessions
**Risk:** Low

**Files:**
- Edit: `~/.claude/hooks/handlers/DocCrossRefIntegrity.ts`
- Or edit the hook registration in settings.json

**Steps:**
1. Currently fires on PostToolUse for doc edits (120 sessions/week)
2. Not all doc edits are meaningful — PRD updates, MEMORY writes, etc. shouldn't trigger cross-ref integrity checks
3. Add a path filter: only fire when the edited file is in `PAI/`, `hooks/`, or project documentation directories
4. Skip for: `MEMORY/WORK/`, `MEMORY/STATE/`, `MEMORY/LEARNING/`, and other ephemeral paths

**Verification:**
- PRD edits no longer trigger DocCrossRefIntegrity
- Edits to PAI system docs still trigger it
- Session count for this hook drops significantly

---

## Expected Combined Savings

| Change | Sessions Saved/week | Cost Saved/week |
|--------|-------------------|-----------------|
| DocCrossRef → Haiku | 0 (same count, cheaper) | ~$1.00 |
| Debounce SessionAutoName | ~50 (if redundant) | ~$0.20 |
| Conditional DocCrossRef | ~60-80 (filtered paths) | ~$0.50 |
| **Total** | **~100** | **~$1.70** |

Small dollars, but cleaner operation and less session bloat.

Monthly: **~$7/month** — this is the lowest-priority plan.

---

## Implementation Order

Task 1 (model downgrade) is trivial and safe. Task 3 (path filtering) has the most impact on reducing noise. Task 2 (debounce) may already be handled.
