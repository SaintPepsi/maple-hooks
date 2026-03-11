# Plan 3: Session Length Management

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent runaway sessions that grow to 800+ calls and consume $40+ each. Enforce state persistence and session rotation at sensible boundaries. Estimated savings: $100-170/week.

**Why this matters:** The biggest sessions in the last week had 840, 1383, and 531 Opus calls. A single 840-call session consumed ~81.5M cache read tokens ($40.75). Context grows linearly with turns, so late-session calls are 2-3x more expensive than early ones (165k vs 53k context per call). The saw-tooth compaction pattern (grow to 165k, compact to 85k, regrow) means each compaction cycle costs more than the previous one.

**Constraint:** Deep sessions must remain possible. This is about smart rotation, not hard caps.

---

## Task 1: Earlier Compaction Threshold

**Savings:** ~22% reduction in average context size per call
**Risk:** Low

**Files:**
- Edit: `~/.claude/PAI/Algorithm/v3.5.0.md` (or component)
- Edit: `~/.claude/PAI/SYSTEM/AISTEERINGRULES.md` (session hygiene rule)

**Steps:**
1. Currently context grows to ~165k before Claude Code triggers autocompact
2. The PAI steering rule says "Compact at 60k tokens" but in practice, the conversation grows well past that because Claude Code's autocompact threshold is separate
3. Add an explicit instruction to the Algorithm: "At each phase transition, check context usage. If above 100k tokens (50% of 200k window), self-compact before proceeding: summarize prior phase outputs, preserve ISC status and key decisions, discard verbose tool output"
4. This means compaction happens at ~100k instead of ~165k, reducing the average context per call

**Math:** If average context drops from 97k to 75k per call, that's a 22% reduction in cache read tokens. At 698M tokens/week: saves ~154M tokens = ~$77/week.

**Verification:**
- Sessions show compaction at ~100k instead of ~165k
- No information loss — ISC status, key decisions, PRD slug preserved
- Average cache read per call drops measurably

---

## Task 2: Session Rotation Advisory

**Savings:** Prevents $40+ monster sessions
**Risk:** Low

**Files:**
- Create: A lightweight PostToolUse hook or Algorithm instruction

**Steps:**
1. After 150 Opus API calls in a session, the system should advise: "This session has reached 150 API calls. Context is at [X]k tokens. Consider persisting state to PRD and starting a fresh session for better efficiency."
2. This is advisory, not blocking — Ian can continue if the work requires it
3. Implementation options:
   - **Option A (simplest):** Add to Algorithm text: "If you've been working for more than 100 tool calls, check context size and recommend session rotation"
   - **Option B (hook):** A PostToolUse hook that counts assistant messages and injects an advisory system-reminder at the 150-call mark
4. Option A is simpler and doesn't add hook overhead. Recommend starting there.

**Verification:**
- After ~150 calls, the AI mentions session rotation
- State is persisted to PRD before rotation
- Fresh session can recover context from PRD

---

## Task 3: Pre-Compaction State Dump

**Savings:** Prevents wasted re-discovery turns after compaction
**Risk:** Low

**Files:**
- Edit: Algorithm text (compaction survival section)

**Steps:**
1. The Algorithm already has a "Compaction survival note" section
2. Strengthen it: before ANY compaction (whether self-triggered or system autocompact), write a PROGRESS section to the PRD containing:
   - Current phase and ISC status (which passed/failed/pending)
   - Key decisions made so far
   - Current file being worked on and what remains
   - Next action to take
3. After compaction, the AI reads the PRD's PROGRESS section to resume immediately instead of re-reading files to reconstruct state

**Verification:**
- Post-compaction recovery takes 1-2 turns instead of 5-10
- No "exploring the codebase" turns after compaction on a known task

---

## Expected Combined Savings

| Change | Mechanism | $/week |
|--------|-----------|--------|
| Earlier compaction (100k vs 165k) | 22% smaller average context | ~$77 |
| Session rotation advisory | Prevents 800+ call sessions | ~$40 |
| Pre-compaction state dump | Fewer recovery turns | ~$15 |
| **Total** | | **~$132** |

Monthly: **~$565/month**.

---

## Implementation Order

Task 1 (compaction threshold) is the highest-value single change. Task 3 (state dump) supports it. Task 2 (rotation advisory) is independent.

Do 1 → 3 → 2.
