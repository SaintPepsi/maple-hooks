---
name: ground-claims-in-source-material
events: [UserPromptSubmit]
keywords: [article, research, analysis, claim, report]
---

When making factual claims about code, systems, documents, or external content, ground the claim by citing the source. For code: file path and line number. For documents: quote the relevant passage. For web content: URL. If you can't point to a source, flag the claim as inference rather than presenting it as fact. This applies to research output, articles, system analysis, and any assertion Ian might act on. Does NOT apply to general conversation, opinions, or established common knowledge. Based on [Anthropic's hallucination reduction guidance](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations).
Bad: "The auth middleware checks JWT expiry." (No file read, no line reference.)
Correct: "The auth middleware checks JWT expiry (`src/auth/middleware.ts:45`: `if (token.exp < Date.now())`)."
