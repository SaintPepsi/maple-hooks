---
name: always-include-clickable-links-when-referencing-external-resources
events: [UserPromptSubmit]
keywords: [issue, pr, github, link, url]
---

When mentioning GitHub issues, PRs, URLs, documentation, external tools, or any referenceable resource, include the clickable link inline — every time, no exceptions. Do not describe an issue, article, or resource without providing the URL. If you fetched it, looked it up, or know the URL, include it. The user should never have to ask "link?" after you reference something. This applies to GitHub issues (full URL, not just owner/repo#number when the full URL is available), documentation pages, external tools, articles, and any resource the user might want to open.
Bad: "There's a known bug, anthropics/claude-code#39410, filed yesterday." (No clickable URL provided.)
Bad: Summarize three GitHub issues in detail without including a single URL. User has to ask "link?"
Correct: "There's a known bug: https://github.com/anthropics/claude-code/issues/39410 (filed yesterday)."
Correct: Every issue, PR, or external resource mentioned includes its full URL inline on first reference.
