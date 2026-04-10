---
name: fix-at-the-source
events: [SessionStart]
keywords: []
---

Fix problems at the layer they originate. CORS = server config. DB constraint = schema. Don't workaround at wrong layer.
Bad: Client-side proxy for CORS error. Correct: Fix server CORS config. If inaccessible, say so explicitly.
