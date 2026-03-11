# Plan 4: Delegate Mechanical Work to Sonnet Subagents

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Shift mechanical file-editing work from Opus to Sonnet subagents during BUILD and EXECUTE phases. Sonnet cache reads cost $0.30/MTok vs Opus $0.50/MTok (40% cheaper per token) and consume less of the rate limit pool. Estimated savings: $42+/week.

**Why this matters:** Ian's steering rules already say "Use Sonnet for implementation sub-agents." But in practice, 99.6% of calls are Opus. The Algorithm doesn't explicitly instruct delegation of mechanical work, so Opus does everything — including file edits, test runs, and repetitive operations that don't need Opus-level reasoning.

**Constraint:** Opus remains the lead agent for all analytical work (OBSERVE, THINK, PLAN, VERIFY, LEARN). Only mechanical BUILD/EXECUTE operations delegate to Sonnet.

---

## Task 1: Add Delegation Guidance to Algorithm BUILD/EXECUTE Phases

**Savings:** Variable, depends on task composition
**Risk:** Low

**Files:**
- Edit: Algorithm component (BUILD and EXECUTE phase sections)
- Run: `bun ~/.claude/PAI/Tools/RebuildPAI.ts`

**Steps:**
1. In the BUILD phase section, add guidance: "For multi-file implementation work, delegate file edits to Sonnet subagents using the Agent tool with `model: 'sonnet'`. Opus plans and coordinates; Sonnet executes."
2. In the EXECUTE phase section, add: "When executing involves 3+ file edits, use Sonnet subagents for the mechanical work. Provide each subagent with exact file paths, line numbers, and the specific change to make."
3. This aligns with the existing steering rule "Model Selection Defaults" which says "Sonnet for implementation sub-agents"
4. Add a guardrail: "Sonnet subagents handle file edits and test runs. Opus handles: ISC creation, architectural decisions, capability selection, verification logic, and anything requiring deep reasoning."

**Examples of what delegates:**
- Writing boilerplate code to a pattern
- Running test suites
- Applying repetitive edits across multiple files
- File creation from templates

**Examples of what stays on Opus:**
- Deciding what to build
- Reviewing whether code meets ISC criteria
- Debugging failures
- Making architectural choices

**Verification:**
- BUILD/EXECUTE phases show Agent tool calls with `model: "sonnet"`
- Opus call count per Algorithm run decreases
- Quality of output doesn't degrade (ISC pass rate stays the same)

---

## Task 2: Use Haiku for Classification Tasks

**Savings:** Minor cost, major rate limit savings
**Risk:** Low

**Files:**
- Edit: Algorithm component (OBSERVE phase, effort level classification)

**Steps:**
1. The effort level classification and capability selection in OBSERVE could be done by Haiku via inference
2. Add option: "For effort level classification, you may use `bun Inference.ts --level fast` to classify the request before proceeding with full OBSERVE analysis"
3. This is optional — the AI can still do it inline if faster

**Note:** This is a small optimization. The real value of Haiku classification is in hooks, where it's already being used correctly.

**Verification:**
- Effort level still classified correctly
- Haiku inference adds at most 1 extra turn but saves Opus context tokens

---

## Expected Savings

If 30% of Opus BUILD/EXECUTE calls delegate to Sonnet:
- 7,200 Opus calls/week × 30% = 2,160 calls moved to Sonnet
- Each call: 97k tokens of context
- Savings per token: $0.50 - $0.30 = $0.20/MTok
- Weekly: 2,160 × 97k × $0.20/MTok = **~$42/week**

More importantly: rate limit pool consumption drops proportionally.

Monthly: **~$180/month**.

---

## Implementation Order

Task 1 is the high-value change. Task 2 is incremental.
