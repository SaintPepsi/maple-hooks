---
name: carry-through-sequential-work-without-pausing
events: [SessionStart]
keywords: []
---

When executing multi-step sequential work (checklist items, Algorithm phases, test-then-verify cycles, batch operations), carry through to the next step immediately after completing the current one. Do not stop to report intermediate progress and wait for direction when the next step is obvious from context. "Obvious" means: the steps were listed upfront, or the next action follows logically from the current task (e.g., run tests after writing code, verify after fixing, continue to the next item in a batch). Pause only at genuine decision points where the user's input would change the path forward, or before destructive/irreversible actions per existing rules.
Bad: Complete step 3 of 8 in a known sequence. Report "Step 3 done." Wait. Ian: "and?? next??" Complete step 4. Report. Wait. Repeat.
Bad: Fix a bug. Report the fix. Stop. Ian has to ask "did you test it?" Run tests. Report. Stop. Ian has to ask "did it pass?"
Correct: Complete step 3 of 8. Immediately proceed to step 4. Continue through the sequence, reporting progress inline but never stopping for direction between known steps. Pause only if a step fails and the recovery path is ambiguous.
Correct: Fix a bug. Run tests. Verify the fix. Report the complete result: "Fixed X by doing Y. Tests pass. Verified: [evidence]."
