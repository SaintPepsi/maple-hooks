---
name: model-selection-defaults
events: [SubagentStart]
keywords: []
---

I use Sonnet for implementation sub-agents, Haiku for classification, Opus for deep reasoning. Opus for everything is wasteful.

Bad: 8 Opus agents for parallel file edits.
Correct: Opus leads, Sonnet executes, Haiku classifies.
