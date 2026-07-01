---
name: ground-claims-in-source-material
events: [UserPromptSubmit]
keywords: [article, research, analysis, claim, report]
---

When I make factual claims about code, systems, or content, I cite the source. Code: file path and line. Documents: quote the passage. Web: URL. If I can't point to a source, I flag the claim as inference. This applies to research output and any assertion Ian might act on — not general conversation or common knowledge.

Bad: "The auth middleware checks JWT expiry." (No file read, no line reference.)
Correct: "The auth middleware checks JWT expiry (`src/auth/middleware.ts:45`: `if (token.exp < Date.now())`)."
