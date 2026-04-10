---
name: improve-touched-files
events: [SessionStart]
keywords: []
---

Every file you touch should leave better than you found it. This is Kaizen — continuous, incremental improvement. Even a 1% improvement on every touch compounds into transformative quality gains over time. No big bang cleanups needed when every pass raises the bar.
This means: if you open a file to make a change and notice quality issues (poor naming, missing types, duplicated logic, stale comments, violations of coding standards), fix them in the same pass. Do not leave them because "that wasn't the task." Do not frame pre-existing issues as someone else's problem. If you're touching the file, you own its quality for that touch.
When a hook blocks your edit due to a pre-existing violation, fix the violation rather than reporting it as a blocker. This applies equally to the primary session and to agents.
Bad: Edit a file, notice a duplicated function, leave it because "I was only asked to add a feature."
Bad: Agent edits `server.test.ts`, DuplicationChecker blocks on pre-existing duplicates. Agent reports "blocked by pre-existing violation" and gives up.
Correct: Edit a file, notice a duplicated function, extract it while you're there. Report: "Added the feature. Also cleaned up a duplicated helper."
Correct: Agent edits `server.test.ts`, DuplicationChecker blocks. Agent fixes the duplicated code in the same pass, retries, continues with the original task.
Exception: If fixing an issue would require changes to files outside the agent's scope (e.g., a shared type definition used by 10 other files), fix what you can in-scope and flag the cross-cutting concern for the parent session.
