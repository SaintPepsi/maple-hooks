# Plan 1: Shrink System Prompt

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce the system prompt from ~53k tokens to ~25-30k tokens. Every token saved is multiplied by every API call in every session (~7,200 Opus calls/week). Estimated savings: $105-140/week in cache read cost.

**Why this matters:** The system prompt is re-read from cache on every single API turn. At 7,200 Opus calls/week with an average 97k context, the ~30k of system prompt accounts for ~31% of every cache read. Cutting it to 15k saves 108M cache read tokens/week.

**Constraint:** No reduction in PAI capability. Every rule, behavior, and capability must remain accessible — just not all loaded upfront.

---

## Task 1: Deduplicate Algorithm from SKILL.md

**Savings:** ~8k tokens/session
**Risk:** Low

**Files:**
- Edit: `~/.claude/PAI/Components/` (whichever component inlines the Algorithm)
- Edit: `~/.claude/settings.json` (add Algorithm as separate contextFile if not already)
- Run: `bun ~/.claude/PAI/Tools/RebuildPAI.ts`

**Steps:**
1. Read `~/.claude/PAI/SKILL.md` and identify where the Algorithm v3.5.0 is inlined
2. Read `~/.claude/settings.json` contextFiles array to see what's currently loaded
3. If the Algorithm is embedded in a Component that gets compiled into SKILL.md:
   - Replace the inline Algorithm text with a 3-line reference: "Algorithm v3.5.0 is loaded separately via contextFiles. See PAI/Algorithm/v3.5.0.md for full text."
   - Ensure `PAI/Algorithm/v3.5.0.md` is listed as a separate contextFile in settings.json
4. Run `bun ~/.claude/PAI/Tools/RebuildPAI.ts` to regenerate SKILL.md
5. Start a fresh session and run `/context` to measure the new token count

**Verification:**
- New SKILL.md is smaller by ~8k tokens
- Algorithm still fully available in context (check by asking about phase order)
- `/context` shows Messages category reduced by ~8k

---

## Task 2: Compress Steering Rules

**Savings:** ~3k tokens/session
**Risk:** Low

**Files:**
- Edit: `~/.claude/PAI/SYSTEM/AISTEERINGRULES.md`
- Edit: `~/.claude/PAI/USER/AISTEERINGRULES.md`
- Run: `bun ~/.claude/PAI/Tools/RebuildPAI.ts`

**Steps:**
1. Read both steering rules files
2. For each rule, compress to this format:
   ```
   ## Rule Name
   Statement: 1-2 sentences.
   Bad: 1 sentence example.
   Correct: 1 sentence example.
   ```
3. Remove multi-paragraph explanations. The statement should be self-evident.
4. Count tokens before and after (use `wc -w` as rough proxy: 1 word ≈ 1.3 tokens)
5. Rebuild SKILL.md

**Verification:**
- Token count reduced by ~3k
- All rules still present (count rule headings before/after — must match)
- Start fresh session, verify steering behavior hasn't degraded

---

## Task 3: Trim Skill Descriptions in Listing

**Savings:** ~2.5k tokens/session
**Risk:** Low

**Files:**
- Edit: Each skill's description in `skill-index.json` or the mechanism that generates the system prompt listing

**Steps:**
1. Identify where the skill listing text comes from (likely `skill-index.json` descriptions that get injected into system prompt)
2. For each skill, trim the description to one line under 20 tokens
3. The trigger word lists ("USE WHEN research, investigate, find information...") should be reduced to 3-5 keywords max — the full trigger list is in each skill's SKILL.md which loads on invocation

**Example transformations:**
```
Before (105 tokens):
Research: USE WHEN user says 'research' (ANY form - this is the MANDATORY trigger), 'do research', 'extensive research', 'quick research'...

After (~15 tokens):
Research: Web research, information gathering, content analysis
```

**Verification:**
- Skill listing in system prompt is ~2.5k smaller
- Skills still trigger correctly (test 3 skills with normal prompts)

---

## Task 4: Lazy-load Coding Standards

**Savings:** ~4k tokens for non-code sessions
**Risk:** Medium

**Files:**
- Edit: `~/.claude/settings.json` (remove coding standards from contextFiles)
- Edit: `~/.claude/PAI/Components/` (remove inline coding standards from SKILL.md components)
- Run: `bun ~/.claude/PAI/Tools/RebuildPAI.ts`

**Steps:**
1. Identify which contextFiles or SKILL.md components load the 3 coding standards docs (General, Hooks, Skills)
2. Remove them from the always-loaded context
3. The CodingStandardsEnforcer hook already catches violations on write — so standards are still enforced even without being in context
4. When the AI needs to write PAI TypeScript, it can read the standards on demand (the hook rejection message can include a hint to read them)
5. Rebuild SKILL.md

**Risk mitigation:** The CodingStandardsEnforcer hook is the safety net. Even without standards in context, violations get caught on Edit/Write. The cost is one extra turn (write → rejected → read standards → rewrite) vs having standards always in context.

**Verification:**
- Start a non-code session, `/context` shows ~4k fewer tokens
- Start a code session, write a PAI .ts file — CodingStandardsEnforcer still catches violations
- Code quality doesn't degrade (hook enforcement still works)

---

## Expected Combined Savings

| Change | Tokens/session | Tokens/week (×7,200 calls) | Cache Read $/week |
|--------|---------------|---------------------------|-------------------|
| Dedup Algorithm | -8,000 | -57.6M | -$28.80 |
| Compress rules | -3,000 | -21.6M | -$10.80 |
| Trim skills | -2,500 | -18.0M | -$9.00 |
| Lazy-load coding standards | -4,000 | -28.8M | -$14.40 |
| **Total** | **-17,500** | **-126M** | **-$63.00** |

System prompt goes from ~53k to ~35.5k (-33%). Cache read savings alone: ~$63/week, ~$270/month.

---

## Implementation Order

Do Tasks 1 → 2 → 3 → 4 in sequence. Each is independently deployable. Verify token count after each with `/context`.
