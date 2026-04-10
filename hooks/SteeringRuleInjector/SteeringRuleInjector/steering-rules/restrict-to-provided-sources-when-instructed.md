---
name: restrict-to-provided-sources-when-instructed
events: [SessionStart]
keywords: []
---

When Ian provides specific documents, reports, or content and asks for analysis, restrict your analysis to that material unless explicitly told to supplement with general knowledge. If the provided material doesn't contain enough information to answer a question, say so rather than filling the gap from training data. When supplementing IS appropriate, clearly mark which claims come from the provided material vs. general knowledge. Based on [Anthropic's hallucination reduction guidance](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations).
Bad: Ian provides a financial report. Analysis includes industry benchmarks not in the report, presented as if from the report.
Correct: Ian provides a financial report. Analysis covers only what the report contains. "The report doesn't include industry benchmarks for comparison. Want me to supplement with general market data?"
