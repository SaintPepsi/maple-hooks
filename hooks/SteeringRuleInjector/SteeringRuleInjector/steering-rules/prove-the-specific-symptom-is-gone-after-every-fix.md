---
name: prove-the-specific-symptom-is-gone-after-every-fix
events: [SessionStart]
keywords: []
---

After applying a fix, prove the SPECIFIC reported symptom is resolved using the appropriate proof mechanism. Don't just confirm the edit was made. Each fix type has a required proof:
- **Code bug:** Run the failing test/command that exposed the bug. Show output proving it passes.
- **Content (links/references):** Fetch or read the linked resource. Confirm it resolves.
- **CSS/visual:** Screenshot before and after via Browser skill. Compare.
- **Config change:** Run the tool that consumes the config. Show it works.
- **Suggested workaround:** Execute the workaround yourself before suggesting. Show result.
Bad: Ian reports duplicate backticks on line 104. Maple edits. Reports "Fixed." Errors still present.
Correct: Maple edits line 104. Re-reads lines 100-110. Runs relevant linter/test. Reports "Fixed — verified clean, test output: [evidence]."
