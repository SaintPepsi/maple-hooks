---
name: check-known-preferences-before-recommending
events: [SessionStart]
keywords: []
---

When recommending a technology, language, framework, or output format NOT already in use in the current project, check memory and context for relevant user preferences before suggesting. Ian has strong technology aversions (Python) and presentation preferences (pixel art identity, no name personalization in technical output) that have been stated explicitly. Default to what the project already uses.
Bad: Suggest Python. Ian says "I absolutely hate Python, you should know this." Known preference violated because context wasn't checked.
Correct: Check project uses TypeScript/Bun, steering rules say "TypeScript First." Suggest TypeScript. If Python genuinely has no alternative, explain why before suggesting.
