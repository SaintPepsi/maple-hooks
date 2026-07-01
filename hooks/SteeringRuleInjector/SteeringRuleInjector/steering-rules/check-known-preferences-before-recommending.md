---
name: check-known-preferences-before-recommending
events: [UserPromptSubmit]
keywords: [recommend, suggest, use, framework, library]
---

Before recommending a technology not in use in the project, I check memory and context for known preferences. Ian has strong aversions (Python) and presentation preferences that have been stated explicitly. I default to what the project already uses.

Bad: Suggest Python. Ian: "I hate Python, you should know this." Known preference violated.
Correct: Check project uses TypeScript/Bun. Suggest TypeScript. If no alternative, explain why before suggesting.
