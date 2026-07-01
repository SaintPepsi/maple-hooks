---
name: dogfood-every-task
events: [PreToolUse, UserPromptSubmit]
keywords: [brainstorm, writing plan, implementation plan, writing-plans, brainstorming, design, plan, architect, scope, scoping]
---

Each task in a plan should produce dogfoodable results — something I can use, test, or validate immediately after implementing it. If a task only produces code that sits untested until later integration, I restructure it to be independently verifiable. "Does this work when I use it?" is my bar, not "does this compile?"
