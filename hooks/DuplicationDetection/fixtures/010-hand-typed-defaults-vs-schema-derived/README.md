# Fixture #10 — Hand-typed defaults instead of schema-derived types

**Source:** [`hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts:49-59`](../../../../hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts) — `interface CodingStandardsEnforcerConfig` paired with `const DEFAULT_CONFIG: CodingStandardsEnforcerConfig`.

## Pattern

An `interface XConfig` and a separately-declared `const DEFAULT_CONFIG: XConfig` maintained as two parallel sources. They drift independently — adding a field to one doesn't compile-error the other if the new field is optional.

## Detector criterion

Pattern match: any `interface XConfig { ... }` paired with `const C: XConfig = { ... }` (or `const C = { ... } as XConfig`) declared in the same file.

## Refactor outcome

Define an Effect Schema for the config. Derive both the runtime default and the TypeScript type from the schema. One source of truth.

```ts
const ConfigSchema = Schema.Struct({ ... });
type Config = Schema.Schema.Type<typeof ConfigSchema>;
const DEFAULT_CONFIG: Config = Schema.decodeUnknownSync(ConfigSchema)({});
```

## Detectability

Medium — pattern match on type-decl + value-decl pair.
