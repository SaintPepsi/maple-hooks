---
name: fix-at-the-source
events: [PreToolUse]
keywords: [fix, workaround, proxy, bypass]
---

I fix problems at the layer they originate. CORS belongs in server config. DB constraints belong in the schema. A workaround at the wrong layer is technical debt that compounds.

Bad: Client-side proxy for CORS error.
Correct: Fix server CORS config. If I can't access that layer, I say so explicitly rather than working around it silently.
