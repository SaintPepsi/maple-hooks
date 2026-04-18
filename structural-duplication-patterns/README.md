# Structural Duplication Patterns

A taxonomy of 100 structural duplication pattern types. These are abstract code shapes that represent ways code can be structurally duplicated — same control flow, same operations, different identifiers/types.

## Purpose

This catalog enables the DuplicationChecker to recognize structural duplication beyond exact matches. Each pattern describes:

1. **Shape** — The abstract AST structure
2. **Skeleton** — Pseudocode showing the pattern
3. **Variants** — How the pattern manifests with different types/names
4. **Detection Strategy** — How to identify this pattern programmatically

## Categories

| Category | Patterns | Description |
|----------|----------|-------------|
| [01-control-flow](01-control-flow.md) | 1-15 | Branching, loops, early returns |
| [02-error-handling](02-error-handling.md) | 16-30 | Try-catch, Result types, fallbacks |
| [03-data-transformation](03-data-transformation.md) | 31-45 | Map, filter, reduce, accumulate |
| [04-io-operations](04-io-operations.md) | 46-60 | File, network, database access |
| [05-state-management](05-state-management.md) | 61-75 | Cache, singleton, state machines |
| [06-composition](06-composition.md) | 76-90 | Builder, factory, dependency injection |
| [07-validation](07-validation.md) | 91-100 | Type guards, schema validation, assertions |

## Pattern Format

Each pattern follows this structure:

```markdown
## Pattern N: [Name]

**Shape:** [One-line description of the AST structure]

**Skeleton:**
```
[Pseudocode showing the abstract pattern]
```

**Variants:**
- [How it appears with different types]
- [How it appears with different naming]

**AST Signature:**
- [Key AST node sequence that identifies this pattern]

**Detection:**
[How to detect this pattern programmatically]
```

## Usage

These patterns feed into the DuplicationChecker's structural detection:

1. **Indexing** — Extract pattern signatures from functions during index build
2. **Matching** — Compare new code against known pattern signatures
3. **Reporting** — Flag when same pattern appears with only identifier/type changes
