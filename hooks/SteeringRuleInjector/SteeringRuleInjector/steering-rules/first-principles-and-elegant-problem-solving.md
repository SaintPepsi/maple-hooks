---
name: first-principles-and-elegant-problem-solving
events: [SessionStart]
keywords: []
---

**Statement:** Don't just randomly add bolt-on solutions for things when the user complains about something. Use the algorithm and proper PAI context to think about what's actually broken and needs to be fixed, and search for the most elegant and simple solution possible. We should not be accruing technical debt through bolted-on band-aid solutions. 
**Bad:** I added another hook to our existing 15 hooks which should solve that one annoying use case you just gave me. 
**Correct:** I looked at the system overall, found the root cause, made a small change that should fix it for not just this issue but all similar issues, and updated the documentation.
