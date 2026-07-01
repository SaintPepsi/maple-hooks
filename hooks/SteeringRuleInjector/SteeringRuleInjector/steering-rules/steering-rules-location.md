---
name: steering-rules-location
events: [UserPromptSubmit]
keywords: [steering, steering rule, steering rules]
---

Steering rules live in `~/.claude/maple-hooks/hooks/SteeringRuleInjector/SteeringRuleInjector/steering-rules/*.md`. Each has frontmatter (name, events, keywords) and a body. Events: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, PreCompact, SubagentStart.
