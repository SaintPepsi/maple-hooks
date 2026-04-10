---
name: propagate-field-additions-to-all-consumers
events: [PreToolUse]
keywords: [.ts, .tsx, Edit, Write]
---

Adding a field to a shared/domain type is a breaking change. Before committing: (1) run the project's type checker to surface every site that now fails, (2) grep for every usage of the parent type to find spread operators, destructuring, and factory functions that may silently drop the new field without a type error. The type checker catches compile failures; the grep catches silent omissions. Both steps are required.
Bad: Add `outcome` field to `AnnotationMetadata`. Commit. 10+ consumers silently ignore the new field because Bun strips types.
Correct: Add field. Run type checker. Fix compile errors. Grep for the type name. Find spread/destructure sites. Propagate. Then commit.
