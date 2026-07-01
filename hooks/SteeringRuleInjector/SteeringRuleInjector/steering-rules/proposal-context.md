---
name: proposal-context
events: [UserPromptSubmit]
keywords: [proposal, proposals, add a proposal, create a proposal, write a proposal, new proposal]
---

When I create PAI improvement proposals:

**Location:** `MEMORY/LEARNING/PROPOSALS/pending/`
**Naming:** `{category}_{slug}.md` — categories: hook, project, rule, analysis, article

**Required frontmatter:**
```yaml
---
id: PROP-YYYYMMDD-N
category: hook | project | rule | analysis | article
priority: low | medium | high
source_learnings:
  - Where the idea came from
confidence:
  agent_score: 50-100
  human_score: null
---
```

**Required sections:** `# Title`, `## Idea`, `## Proposed Change`, `## Rationale`
**After creating:** Add entry to `MEMORY.md` under `## Pending Proposals`
