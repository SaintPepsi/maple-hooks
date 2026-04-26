# Fixture #13 — If-chain validation instead of schema parse

**Source:** [`hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts:82-89`](../../../../hooks/CodingStandards/CodingStandardsEnforcer/CodingStandardsEnforcer.contract.ts) — `getEditParts`

## Pattern

A function whose body is a chain of `if (!x.foo) return null; if (typeof x.bar !== "string") return null; ...` performing manual structural validation, then extracting a typed value at the end.

## Detector criterion

Functions whose body is a sequence of:
- N+ early `return null` / `return undefined` guards
- Each guard checks shape (`typeof`, `!== undefined`, property existence)
- Final return extracts a typed value from the input

This is a schema-replacement candidate.

## Refactor outcome

Replace with one Effect Schema parse:
```ts
const EditPartsSchema = Schema.Struct({ ... });
const parse = Schema.decodeUnknownEither(EditPartsSchema);
function getEditParts(input: ToolHookInput) {
  const result = parse(input.tool_input);
  return result._tag === "Right" ? result.right : null;
}
```

The function becomes one `parse → return`.

## Detectability

Hard — subjective; many valid validation styles. Likely advisory.
