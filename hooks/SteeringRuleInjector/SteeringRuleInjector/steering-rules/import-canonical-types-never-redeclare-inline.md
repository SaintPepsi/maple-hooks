---
name: import-canonical-types-never-redeclare-inline
events: [PreToolUse]
keywords: [.ts, .tsx, Edit, Write]
---

Before creating a union type, I grep for it. If it exists in a canonical location, I import it. Inline redeclarations diverge silently when the canonical type changes. When I create a NEW union type that appears in more than one file, I extract it to a shared module immediately.

Bad: Three files each declare `"win"|"loss"|"pending"|""` inline. Canonical `Outcome` exists in schema.ts.
Correct: All files import `Outcome` from schema.ts. One source of truth.
