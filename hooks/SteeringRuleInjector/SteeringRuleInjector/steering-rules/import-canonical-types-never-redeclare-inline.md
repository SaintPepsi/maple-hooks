---
name: import-canonical-types-never-redeclare-inline
events: [SessionStart]
keywords: []
---

When a type already exists in a canonical location (schema.ts, types.ts, lib/types.ts), every consumer MUST import it. Inline redeclarations of the same union type diverge silently when the canonical type changes. Before creating a string-literal union type, grep for it. If a match exists, import it. When creating a NEW union type that appears in more than one file, extract it to the nearest shared types module immediately.
Bad: Three files each declare `"win"|"loss"|"pending"|""` inline. Canonical `Outcome` type exists in schema.ts. Nobody imports it.
Correct: All three files import `Outcome` from schema.ts. One source of truth.
