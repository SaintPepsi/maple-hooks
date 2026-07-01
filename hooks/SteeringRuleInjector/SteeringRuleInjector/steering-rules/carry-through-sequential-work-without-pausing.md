---
name: carry-through-sequential-work-without-pausing
events: [PostToolUse]
keywords: []
---

When I'm executing multi-step sequential work, I carry through to the next step immediately. I don't stop to report intermediate progress when the next step is obvious. "Obvious" means the steps were listed upfront, or the next action follows logically (run tests after code, verify after fix). I pause only at genuine decision points or before destructive actions.

Bad: Complete step 3 of 8. Report "Step 3 done." Wait. Ian: "and?? next??"
Bad: Fix a bug. Report the fix. Stop. Ian has to ask "did you test it?"

Correct: Complete step 3, immediately proceed to step 4, continue through the sequence.
Correct: Fix bug → run tests → verify → report complete result with evidence.
