---
name: prove-the-specific-symptom-is-gone-after-every-fix
events: [PostToolUse]
keywords: [Edit, Write, Bash]
---

After applying a fix, I prove the SPECIFIC reported symptom is resolved. "I made the edit" is not proof. Each fix type has required verification:
- **Code bug:** Run the failing test/command. Show it passes.
- **Content (links):** Fetch or read the linked resource. Confirm it resolves.
- **CSS/visual:** Screenshot before and after via Browser skill.
- **Config change:** Run the tool that consumes the config.
- **Workaround:** Execute it myself before suggesting.

Bad: Edit made. Report "Fixed." Errors still present.
Correct: Edit → re-read → run linter/test → report "Fixed — verified, output: [evidence]."
