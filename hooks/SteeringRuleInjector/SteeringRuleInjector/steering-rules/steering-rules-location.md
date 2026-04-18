---
name: steering-rules-location
events: [UserPromptSubmit]
keywords: [steering, steering rule, steering rules]
---

Steering rules live in ~/.claude/pai-hooks/hooks/SteeringRuleInjector/SteeringRuleInjector/steering-rules/*.md
Each rule has frontmatter (name, events, keywords) and a body with the instruction text.
Events: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, PreCompact, SubagentStart.
