# Plan 2: Reduce Ceremony Turns Without Reducing Depth

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce the number of mechanical API turns per Algorithm run without reducing analytical depth. Each unnecessary turn costs ~97k cache read tokens. Estimated savings: 20-40 turns per Algorithm run = 2-4M cache read tokens per run.

**Why this matters:** Ian prefers thorough Algorithm mode over shallow Native mode — depth produces better, more deterministic results. The issue isn't the Algorithm's analytical value, it's mechanical overhead: voice curls, PRD micro-updates, and phase headers that each trigger a separate API turn.

**Constraint:** All 8 Algorithm phases remain. ISC criteria remain. PRD tracking remains. Only the mechanical overhead changes.

---

## Task 1: Batch Voice Curls Into Text Output

**Savings:** 6-7 API turns per Algorithm run
**Risk:** Low (voice still works, just delivered differently)

**Files:**
- Edit: `~/.claude/PAI/Algorithm/v3.5.0.md` (or whichever Component contains Algorithm text)
- Run: `bun ~/.claude/PAI/Tools/RebuildPAI.ts`

**Steps:**
1. Currently each phase transition says: "FIRST ACTION: Voice announce..." which triggers a separate `curl` tool call
2. Change the instruction so the voice curl is a **background Bash call combined with the next real action**, not a standalone tool call
3. Instead of:
   ```
   Turn 1: curl voice notification
   Turn 2: Edit PRD frontmatter
   Turn 3: Begin phase work
   ```
   Change to:
   ```
   Turn 1: (single Bash call that runs curl in background) && (real work begins)
   ```
   Or better: the voice curl runs as part of the PRD edit turn's preamble
4. Update the Algorithm text to say: "At each phase transition, announce via background curl AND edit PRD frontmatter in the same turn"

**Verification:**
- Voice notifications still fire at each phase transition
- PRD frontmatter still updates
- Tool call count per Algorithm run drops by 6-7

---

## Task 2: Consolidate PRD Updates

**Savings:** 3-5 API turns per Algorithm run
**Risk:** Low

**Files:**
- Edit: Algorithm component in `~/.claude/PAI/Components/`
- Run: `bun ~/.claude/PAI/Tools/RebuildPAI.ts`

**Steps:**
1. Currently the Algorithm mandates PRD frontmatter edits at every phase boundary (8 edits for 8 phases)
2. Change to: Write PRD once at OBSERVE (full creation), update at phase transitions only when there's substantive content to add (not just phase name change)
3. The phase tracking can be done internally — it doesn't need to be persisted to disk on every transition since the session state is in context
4. PRD still gets updated at: OBSERVE (create), EXECUTE (criteria checkmarks), VERIFY (evidence), LEARN (complete). That's 4 edits instead of 8.

**Verification:**
- PRD still contains all criteria, decisions, verification evidence
- PRD final state is identical to current approach
- 3-5 fewer Edit tool calls per Algorithm run

---

## Task 3: Combine Independent Tool Calls at Phase Boundaries

**Savings:** 2-3 API turns per Algorithm run
**Risk:** Low

**Files:**
- Edit: Algorithm component
- Run: Rebuild

**Steps:**
1. At Algorithm entry, currently there are separate calls: voice curl, console output, PRD directory creation, PRD write
2. Instruct the Algorithm to use parallel tool calls where possible:
   - Voice curl (Bash) + PRD mkdir (Bash) = 1 turn with 2 parallel calls
   - PRD Write + next phase's initial read = 1 turn with 2 parallel calls
3. Add explicit instruction: "When entering a new phase, batch the voice curl, PRD edit, and initial phase work into as few turns as possible using parallel tool calls"

**Verification:**
- Same outputs produced
- Fewer total API turns per session

---

## Task 4: Skip DISCOVER for Same-Project Continuation

**Savings:** 3-8 API turns for follow-up tasks
**Risk:** Low

**Files:**
- Edit: Algorithm component (DISCOVER phase section)
- Run: Rebuild

**Steps:**
1. DISCOVER is valuable for first-contact with unfamiliar code. But when continuing work in the same project across sessions, re-discovering the same codebase wastes turns.
2. Add a rule: "If prior work exists in MEMORY/WORK/ for this project area within the last 48 hours, skip DISCOVER and reference the prior PRD's Discovery section instead"
3. This is already somewhat supported by the "Skip for trivial single-file changes" guidance, but extend it to "Skip when prior Discovery findings are fresh and relevant"

**Verification:**
- Follow-up tasks in same project area skip DISCOVER
- First-contact tasks still run DISCOVER
- No loss of context for follow-up work

---

## Expected Combined Savings

At 167 avg calls/session with ~40 being ceremony, reducing ceremony to ~25:

| Change | Turns Saved/Run | Cache Reads Saved | $/week |
|--------|----------------|-------------------|--------|
| Batch voice curls | 6-7 | ~650k tokens/run | ~$15 |
| Consolidate PRD | 3-5 | ~400k tokens/run | ~$10 |
| Parallel tool calls | 2-3 | ~250k tokens/run | ~$6 |
| Skip DISCOVER on continuation | 3-8 | ~500k tokens/run | ~$12 |
| **Total** | **14-23** | **~1.8M/run** | **~$43** |

With ~20 Algorithm runs/week: **~$43/week, ~$185/month**.

---

## Implementation Order

Tasks 1 → 2 → 3 → 4 in sequence. Each is a text edit to the Algorithm definition, followed by a rebuild.
