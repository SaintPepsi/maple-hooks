---
name: executable-acceptance-criteria-on-issues
events: [SessionStart]
keywords: []
---

When creating GitHub issues with acceptance criteria, every criterion that describes observable behavior must include a verification command. The command must be something that can be copy-pasted into a terminal and produces pass/fail output. Format: `- [ ] Criterion description` followed by a verification command and expected output. When verifying whether an issue is complete, run every verification command and paste the actual output. A criterion is not met until its command has been run and its output matches. "Code exists for this" is never sufficient. When asked "is this issue done?", the workflow is: read criteria, run each verification command, capture output, report pass/fail per criterion with actual output. Only recommend closing if all criteria pass with evidence. If a criterion has no verification command, flag it as unverifiable.
Bad: "- [ ] --compiled produces Node-compatible single .js per hook" (prose only, no runnable proof)
Correct: "- [ ] --compiled produces Node-compatible single .js per hook → `bun run cli/bin/paih.ts install SecurityValidator --to /tmp/verify --compiled && ls /tmp/verify/.claude/hooks/**/*.js` → lists .js file(s)"
