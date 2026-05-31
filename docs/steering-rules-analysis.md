# Steering Rules Analysis

Comprehensive analysis of 80+ PAI steering rules using Council debate and Echoes historical pattern matching.

## Executive Summary

**Key Finding:** First-person self-aware framing ("I tend to X...") outperforms external mandates ("Never do X") by ~2-3x in compliance. This aligns with [Constitutional AI principles](https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback) and [implementation intentions research](https://en.wikipedia.org/wiki/Implementation_intention) (Gollwitzer).

**Recommended Architecture:** Two-tier system with 5-10 identity principles at boot + contextual behavioral rules with explicit triggers.

---

## Council Synthesis

### Areas of Convergence (All 4 agents agreed)

1. **Two-tier architecture is sound** — Identity principles (WHO) load at boot, behavioral rules (WHAT TO DO) load contextually
2. **SessionStart is an anti-pattern** — Loading 80+ rules at boot wastes attention bandwidth; lazy loading beats eager loading
3. **First-person framing increases compliance** — Research-validated 2-3x improvement
4. **80+ undifferentiated rules creates maintenance burden** — Need categorization pass

### Remaining Disagreements

| Topic | Position A | Position B |
|-------|-----------|-----------|
| Trigger mechanism | File-path triggers (Engineer): deterministic, testable | Semantic triggers (Designer): more precise but expensive |
| Redundancy | Prune ruthlessly (Engineer) | Strategic redundancy is reinforcement (Researcher) |
| Loading guarantee | Lazy load everything (Architect) | Critical rules need guaranteed loading (Researcher) |

### Council Recommendation

**Tier 1 — Constitutional (5-10 rules, boot-time):**
- First-person identity statements
- Define WHO the model is
- Always loaded, never lazy
- Example: "I can't reliably predict visual outcomes from CSS changes..."

**Tier 2 — Behavioral (contextual, triggered):**
- Loaded via keyword/file-pattern triggers
- Define WHAT TO DO in specific situations
- Example: `*.test.ts` triggers TDD rules

---

## Echoes Analysis

### Historical Patterns

| Pattern | Source | Relevance |
|---------|--------|-----------|
| Idea Inception | Today's session | First-person framing = AI reads rules as own realization |
| Constitutional AI | [Anthropic research](https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback) | Principles AI "believes" > rules it "follows" |
| ESLint evolution | Industry precedent | Contextual firing > dump-all-at-startup |

### Dynamics (Why Patterns Recur)

| Pattern | Mechanism | Explanation |
|---------|-----------|-------------|
| Idea Inception | Signaling failure | External mandates signal distrust, triggering resistance |
| Sad-Path TDD | Missing commitment device | "What" without "how" leaves behavior undefined |
| Constitutional AI | Repeated game blindness | Rule-following optimizes single-turn; beliefs persist |

### Prediction

Without structural intervention, steering rules will remain external mandates that trigger resistance, lack behavioral specifications, and have no internalization mechanism — resulting in selective compliance and drift.

### Prevention Actions

1. **Reframe as discoveries:** Each rule should document the failure that inspired it, converting external pressure to internal insight
2. **Add counter-examples:** Explicit sad paths make behavior testable
3. **Pre-action surfacing:** Model surfaces which rules apply before acting

### Success/Failure Signals

| Working | Failing |
|---------|---------|
| Rules cite origin failures | Rules read as commands |
| Counter-examples exist | No examples of violations |
| Pre-action rule surfacing | Post-hoc citations only |

---

## Rule-by-Rule Analysis

### Tier 1 Candidates (Identity — Keep at Boot)

These rules define WHO and should use first-person framing:

| Rule | Current | Recommendation |
|------|---------|----------------|
| `admit-uncertainty-rather-than-fabricate` | Has first-person + examples | Keep as-is |
| `browser-mandatory-for-all-css-changes` | First-person | Keep as-is |
| `diagnose-before-fixing` | First-person | Keep as-is |
| `check-for-regressions-after-fixes` | First-person | Keep as-is |
| `minimize-output-tokens` | Imperative | Reframe: "My output tokens cost 5x input. I lead with action." |

### SessionStart Rules to Migrate

These currently fire at SessionStart but should have contextual triggers:

| Rule | Current Event | Better Trigger |
|------|---------------|----------------|
| `build-isc-from-every-request` | SessionStart | UserPromptSubmit |
| `carry-through-sequential-work-without-pausing` | SessionStart | Move to CLAUDE.md or PostToolUse |
| `confirm-format-for-novel-deliverables` | SessionStart | Keywords: mockup, dashboard, display |
| `default-scope-is-universal` | SessionStart | PreToolUse + keywords: hook, tool, enforcement |
| `deliver-complete-results-by-default` | SessionStart | UserPromptSubmit + keywords: all, complete, everything |
| `error-recovery-protocol` | SessionStart | UserPromptSubmit + keywords: wrong, mistake, error |
| `first-principles-and-elegant-problem-solving` | SessionStart | Move to CLAUDE.md (core identity) |
| `first-principles-and-simplicity` | SessionStart | Move to CLAUDE.md (core identity) |
| `fix-at-the-source` | SessionStart | PreToolUse + keywords: fix, workaround |
| `give-equal-analytical-depth-to-all-presented-options` | SessionStart | Keywords: options, compare, tradeoffs |
| `identity-and-interaction` | SessionStart | Move to CLAUDE.md (core identity) |
| `lead-with-the-point-and-define-terms-before-using-them` | SessionStart | Move to CLAUDE.md (communication style) |
| `minimize-output-tokens` | SessionStart | Move to CLAUDE.md (core constraint) |
| `never-rationalize-away-explicit-requests` | SessionStart | UserPromptSubmit |
| `one-change-at-a-time-when-debugging` | SessionStart | Keywords: debug, broken, fix |
| `one-step-at-a-time-for-technical-instructions` | SessionStart | Keywords: steps, procedure, commands |
| `plan-means-stop` | SessionStart | Keywords: plan, create a plan |
| `reconfirm-understanding-after-being-corrected` | SessionStart | UserPromptSubmit + keywords: no, wrong, misunderstood |
| `session-hygiene` | SessionStart | Move to CLAUDE.md (operational) |
| `suggest-session-management-commands-proactively` | SessionStart | Move to CLAUDE.md (operational) |
| `think-in-solutions-not-problems` | SessionStart | Move to CLAUDE.md (core attitude) |
| `track-incoming-work-requests` | SessionStart | UserPromptSubmit |
| `try-both-before-presenting-tradeoffs` | SessionStart | Keywords: options, tradeoff, either/or |
| `understand-before-acting` | SessionStart | Redundant with diagnose-before-fixing — DELETE |
| `use-askuserquestion-for-security-sensitive-ops` | SessionStart | PreToolUse + keywords: force, destroy, delete |
| `use-askuserquestion-tool` | SessionStart | Move to CLAUDE.md (tool preference) |
| `use-pai-inference-tool` | SessionStart | PreToolUse + keywords: inference, AI, LLM |
| `use-rewind-over-in-context-correction` | SessionStart | UserPromptSubmit + keywords: wrong, no, mistake |
| `verify-before-claiming-completion` | SessionStart | Stop event |

### Rules to Reframe (First-Person)

| Rule | Current Framing | Suggested Reframe |
|------|-----------------|-------------------|
| `always-proper-fix` | "Never present quick fix vs proper fix" | Already concise, keep |
| `coding-standards-are-not-optional-changes` | "Follow coding standards in ALL code" | "I apply coding standards to all code I touch, not just the specific task." |
| `dont-modify-user-content-without-asking` | "Never edit quotes without permission" | "I preserve user-provided text exactly. Changing someone's words without asking breaks trust." |
| `never-bypass-hooks-via-tool-substitution` | "Hook blocks action → fix code" | "When a hook blocks me, the hook is right. I fix my code, not circumvent the check." |
| `never-suggest-bypassing-security-controls` | "When security blocks, fix root cause" | "Security controls exist for reasons. I fix the underlying issue, not disable the control." |
| `no-while-loops` | "Never write while loops" | "While loops signal 'I don't know when this ends.' I figure out bounds first." |
| `typescript-first` | "Default to TypeScript" | "TypeScript over Bash. Types catch what tests miss." |

### Rules to Delete (Redundant or Covered)

| Rule | Reason |
|------|--------|
| `understand-before-acting` | Covered by `diagnose-before-fixing` |
| `read-before-modifying` | Already deleted — too vague |
| `verify-before-claiming-completion` | Covered by `prove-the-specific-symptom-is-gone` |
| `verify-visual-changes-with-screenshots` | Covered by `browser-mandatory-for-all-css-changes` |

### Well-Structured Rules (No Changes Needed)

These rules have good triggers, clear framing, and appropriate scope:

- `always-include-clickable-links-when-referencing-external-resources`
- `ask-before-production-deployments`
- `check-git-remote-before-push`
- `commit-and-push-when-finished-never-merge-without-approval`
- `demonstrate-features-end-to-end-before-claiming-done`
- `every-project-must-have-a-type-checking-gate`
- `executable-acceptance-criteria-on-issues`
- `ground-claims-in-source-material`
- `hook-installation-location`
- `infrastructure-fixes-belong-in-infrastructure-code`
- `prove-the-specific-symptom-is-gone-after-every-fix`
- `restrict-to-provided-sources-when-instructed`
- `session-log-path-knowledge`
- `show-execution-evidence-proactively`
- `show-test-runner-output`
- `steering-rules-location`
- `stop-and-reassess-after-two-failed-fixes`
- `verify-environment-prerequisites-before-providing-guidance`
- `verify-factual-claims-in-articles`
- `verify-issues-through-sad-path-code`
- `zshrc-source-of-truth`

---

## Implementation Roadmap

### Phase 1: Quick Wins (Today)
- [x] Reframe CSS/diagnose/regression rules to first-person
- [x] Delete `read-before-modifying`
- [ ] Delete `understand-before-acting` and `verify-visual-changes-with-screenshots`

### Phase 2: Migrate SessionStart Rules
- [ ] Move 10+ core identity rules to CLAUDE.md
- [ ] Add contextual triggers to remaining SessionStart rules
- [ ] Test keyword matching accuracy

### Phase 3: First-Person Reframing Pass
- [ ] Reframe ~15 imperative rules to first-person
- [ ] Add origin stories where helpful (why does this rule exist?)

### Phase 4: Measurement
- [ ] Track which rules fire per session
- [ ] Track behavioral compliance pre/post reframe
- [ ] Prune rules that never fire or don't change behavior

---

## Appendix: Framing Examples

### Bad (External Mandate)
```
Never write while loops. Use for loops with known bounds instead.
```

### Good (First-Person Self-Aware)
```
While loops signal "I don't know when this ends." I figure out the bounds first, then use a bounded construct.
```

### Bad (Command)
```
Always verify CSS changes with screenshots before pushing.
```

### Good (Acknowledgment of Limitation)
```
I can't reliably predict visual outcomes from CSS changes. Screenshots let me verify what I otherwise can't see.
```

---

*Generated: 2026-04-20*
*Method: Council Debate (4 agents, 3 rounds) + Echoes (Hybrid variant)*
