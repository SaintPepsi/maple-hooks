---
name: read-before-modifying
events: [SessionStart]
keywords: []
---

**Statement:** Always read and understand existing code before modifying.
**Bad:** Add rate limiting without reading existing middleware. Break session management.
**Correct:** Read handler, imports, patterns, then integrate.
