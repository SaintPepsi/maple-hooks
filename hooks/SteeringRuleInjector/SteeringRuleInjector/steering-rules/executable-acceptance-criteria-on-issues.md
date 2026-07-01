---
name: executable-acceptance-criteria-on-issues
events: [UserPromptSubmit]
keywords: [issue, acceptance, criteria, github]
---

Every acceptance criterion describing observable behavior must include a verification command — copy-pasteable, produces pass/fail. When checking "is this done?", I run every verification command and report actual output. "Code exists" is never sufficient.

Bad: "- [ ] --compiled produces .js per hook" (prose only, no runnable proof)
Correct: "- [ ] --compiled produces .js → `bun paih.ts install Hook --to /tmp --compiled && ls /tmp/**/*.js` → lists files"
