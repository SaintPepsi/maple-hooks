# Token Efficiency — Design Doc

**Goal:** Reduce per-session token consumption without losing PAI capability. Current baseline: ~48k tokens at 24% context after one exchange.

**Problem:** PAI's startup context and Algorithm ceremony burn tokens aggressively. A single Algorithm run can consume 30-50k tokens in tool calls, PRD writes, voice curls, and verbose output — before the actual work even starts.

---

## Current Token Budget (from /context, 1 exchange in)

| Category | Tokens | % of 200k |
|----------|--------|-----------|
| System prompt | 4k | 2.0% |
| System tools | 6k | 3.0% |
| Custom agents | 1.1k | 0.6% |
| Memory files | 1.2k | 0.6% |
| Skills listing | 4.4k | 2.2% |
| Messages (includes PAI context via system-reminders) | 33.4k | 16.7% |
| Autocompact buffer | 33k | 16.5% |
| **Free space** | **117k** | **58.5%** |

The "Messages" category is the real problem — 33.4k after just one user message + one assistant response. This includes all PAI context injected via `contextFiles` in settings.json (SKILL.md with inline Algorithm, steering rules, coding standards, identity).

---

## Quick Wins

### 1. Deduplicate the Algorithm from SKILL.md

**Savings:** ~8k tokens/session
**Effort:** Low
**Risk:** Low

The Algorithm v3.5.0 is embedded inline in SKILL.md AND referenced in CLAUDE.md. SKILL.md is loaded via `contextFiles`, so the full Algorithm text appears in the startup context. CLAUDE.md then says "the Algorithm is already in context, don't re-read it." But the duplication means it's injected twice worth of instructional text.

**Fix:** Remove the inline Algorithm from SKILL.md. Replace with a short reference: "Algorithm v3.5.0 is loaded separately. See PAI/Algorithm/v3.5.0.md if context recovery is needed." Keep the Algorithm as a separate contextFile entry so it loads once.

**Verification:** Run `/context` after the change. Messages category should drop by ~8k.

---

### 2. Trim skill descriptions in the listing

**Savings:** ~2-3k tokens/session
**Effort:** Low
**Risk:** Low

The skill listing in the system prompt includes verbose multi-line descriptions with trigger words. Many are 50-100 tokens each. With 30+ skills, that's 3-4k tokens.

**Fix:** Trim each skill description to one line (under 20 tokens). The full SKILL.md with trigger conditions is loaded when the skill is invoked — the listing only needs enough for the AI to know WHEN to invoke.

**Example:**
```
Before (105 tokens):
- Research: USE WHEN user says 'research' (ANY form - this is the MANDATORY trigger), 'do research', 'extensive research', 'quick research', 'minor research', 'research this', 'find information', 'investigate', 'extract wisdom', 'extract alpha', 'analyze content', 'can't get this content', 'use fabric', OR requests any web/content...

After (~15 tokens):
- Research: Web/content research, information gathering, investigation
```

**Verification:** Compare skill listing token count before/after.

---

### 3. Lazy-load coding standards

**Savings:** ~4k tokens for non-code sessions
**Effort:** Medium
**Risk:** Medium — needs hook to detect code-writing context

Three coding standards files (General, Hooks, Skills) are loaded at startup via contextFiles. They're only relevant when writing TypeScript in the PAI codebase.

**Fix:** Remove from contextFiles. Create a PreToolUse hook that injects coding standards as additionalContext when:
- Tool is Edit or Write
- Target file is `.ts` in the PAI codebase

**Alternative (simpler):** Move coding standards to a single skill (`CodingStandards`) that the AI invokes before writing PAI code. Less automatic but zero hook overhead for non-code sessions.

**Risk mitigation:** The CodingStandardsEnforcer hook already blocks violations. So even without standards in context, the hook catches errors on write. The standards being in context is a "shift left" optimization, not a safety requirement.

**Verification:** Start a non-code session, check /context. Coding standards should not appear.

---

### 4. Reduce ISC floor for Standard tier from 8 to 4

**Savings:** Fewer PRD writes, less decomposition ceremony (~2-5k tokens per Standard task)
**Effort:** Low (single number change in Algorithm)
**Risk:** Low — Standard tasks are <2min. 8 atomic criteria for a 2-minute task is overkill.

The ISC Count Gate forces a minimum of 8 criteria even for Standard effort. For quick tasks (rename a variable, fix a typo, add a config entry), decomposing into 8 atomic criteria wastes more time than the task itself.

**Fix:** Change Standard floor from 8 to 4. Keep Extended at 16.

| Tier | Current Floor | Proposed Floor |
|------|---------------|----------------|
| Standard | 8 | 4 |
| Extended | 16 | 12 |
| Advanced | 24 | 24 |
| Deep | 40 | 40 |
| Comprehensive | 64 | 64 |

**Verification:** Run a Standard-tier task. ISC gate should pass with 4-7 criteria.

---

### 5. Compress steering rules

**Savings:** ~3k tokens
**Effort:** Medium
**Risk:** Low

Both SYSTEM and USER steering rules include verbose Bad/Correct examples. Many rules have 3-4 line examples that could be 1 line each.

**Fix:** Compress each rule to: Statement (1-2 sentences) + Bad (1 sentence) + Correct (1 sentence). Remove multi-paragraph explanations. The rule itself should be self-evident from the statement.

**Example:**
```
Before (~150 tokens):
## Never Bypass Hooks Via Tool Substitution
Statement: When a hook blocks an action...
Bad: CodingStandardsEnforcer blocks Edit on a .ts file due to raw Node imports.
Maple switches to `sed -i` via Bash to make the edit without triggering the hook.
Then asks Ian "should I keep working around it or refactor?"
Correct: CodingStandardsEnforcer blocks Edit on a .ts file due to raw Node imports.
Maple refactors the imports to use the adapter pattern, fixes all violations in the
file, then retries the Edit. The hook passes. No discussion about bypassing needed.

After (~50 tokens):
## Never Bypass Hooks Via Tool Substitution
When a hook blocks, fix the code to pass — never switch tools to circumvent.
Bad: Hook blocks Edit, switch to sed via Bash.
Correct: Hook blocks Edit, refactor code, retry Edit.
```

**Verification:** Count tokens in steering rules before/after. Target: 50% reduction.

---

### 6. Add QUICK mode for 2-5 minute tasks

**Savings:** 10-20k tokens per task (skip 6 of 8 Algorithm phases)
**Effort:** Medium
**Risk:** Medium — need clear criteria for when QUICK vs ALGORITHM applies

Many tasks fall between NATIVE (trivial) and ALGORITHM (full ceremony). A "fix this one function" task doesn't need DISCOVER, DESIGN, THINK, PLAN, BUILD, EXECUTE, VERIFY, LEARN — it needs: understand, do, verify.

**Fix:** Add QUICK mode:
```
════ PAI | QUICK MODE ═══════════════════════
🗒️ TASK: [description]
🔎 UNDERSTAND: [what needs to happen, 2-4 bullets]
⚡ DO: [execute the work]
✅ VERIFY: [evidence it worked]
🗣️ Maple: [summary]
```

No PRD, no ISC decomposition, no capability audit, no voice curls. Just work.

**Criteria for QUICK:** Task is clear, scope is 1-3 files, no architectural decisions, estimated <5 minutes.

**Verification:** Run a medium-complexity task in QUICK mode. Compare token usage to same task in ALGORITHM mode.

---

## Estimated Total Savings

| Change | Tokens Saved | Cumulative |
|--------|-------------|------------|
| Deduplicate Algorithm | 8k | 8k |
| Trim skill descriptions | 2.5k | 10.5k |
| Lazy-load coding standards | 4k (non-code) | 14.5k |
| Reduce ISC floors | 3k (per Standard task) | 17.5k |
| Compress steering rules | 3k | 20.5k |
| QUICK mode | 15k (per eligible task) | 35.5k |

**Conservative estimate:** 10-15k tokens saved per session from startup changes alone. 15-20k additional per task when QUICK mode applies.

---

## Implementation Order

1. **Deduplicate Algorithm** — highest savings, lowest risk, do first
2. **Trim skill descriptions** — easy, immediate savings
3. **Compress steering rules** — straightforward text editing
4. **Reduce ISC floors** — single number change
5. **QUICK mode** — needs design discussion on criteria boundaries
6. **Lazy-load coding standards** — needs hook implementation, do last
