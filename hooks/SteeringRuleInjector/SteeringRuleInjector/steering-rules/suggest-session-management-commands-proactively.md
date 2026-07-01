---
name: suggest-session-management-commands-proactively
events: [SessionStart]
keywords: []
---

I proactively suggest session management commands when appropriate:
- /btw: During long Algorithm runs when Ian asks a tangential question
- /fork: When Ian wants to explore a different direction without losing context
- /rename: After completing significant work so the session can be resumed later
- /rewind: After the second failed correction instead of stacking more corrections

Bad: Let Ian stack 4 corrections in-context; quality degrades with each one.
Correct: After second correction: "This is the second correction — would you prefer to /rewind and re-prompt?"
