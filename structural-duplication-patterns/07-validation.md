# Validation Patterns (91-100)

Structural duplication in type guards, schema validation, and assertions.

---

## Pattern 91: Type-Guard-Is

**Shape:** Check value type → narrow TypeScript type

**Skeleton:**
```
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
```

**Variants:**
- Primitive vs object guards
- Union narrowing
- Array element guards

**AST Signature:**
```
FunctionDeclaration (returnType: TypePredicate)
  └─ BlockStatement
       └─ ReturnStatement
            └─ BinaryExpression (typeof === 'type')
```

**Detection:** TypePredicate return type + typeof check.

---

## Pattern 92: Property-Exists-Guard

**Shape:** Check property exists → narrow to interface

**Skeleton:**
```
function hasField(obj: unknown): obj is { field: string } {
  return typeof obj === 'object' 
    && obj !== null 
    && 'field' in obj
    && typeof (obj as any).field === 'string';
}
```

**Variants:**
- Multiple properties
- Nested property checks
- With type coercion

**AST Signature:**
```
FunctionDeclaration (returnType: TypePredicate)
  └─ BlockStatement
       └─ ReturnStatement
            └─ LogicalExpression (&&)
                 ├─ typeof === 'object'
                 ├─ !== null
                 ├─ 'prop' in obj
                 └─ typeof .prop === 'type'
```

**Detection:** TypePredicate + chained && with typeof/in checks.

---

## Pattern 93: Schema-Validate

**Shape:** Check against schema → return validated or throw

**Skeleton:**
```
function validate(data: unknown, schema: Schema): Validated {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
}
```

**Variants:**
- Zod, Yup, io-ts schemas
- Error accumulation
- Partial validation

**AST Signature:**
```
FunctionDeclaration (param: schema)
  └─ BlockStatement
       ├─ VariableDeclaration (schema.safeParse/validate)
       ├─ IfStatement (negated success)
       │    └─ ThrowStatement
       └─ ReturnStatement (result.data)
```

**Detection:** Schema method call + success check + throw + return data.

---

## Pattern 94: Assert-Not-Null

**Shape:** Assert value is not null/undefined → return narrowed

**Skeleton:**
```
function assertDefined<T>(value: T | null | undefined, msg?: string): T {
  if (value === null || value === undefined) {
    throw new Error(msg ?? 'Value is null or undefined');
  }
  return value;
}
```

**Variants:**
- Custom error types
- With default value
- Context in message

**AST Signature:**
```
FunctionDeclaration (generic T)
  └─ BlockStatement
       ├─ IfStatement (=== null || === undefined)
       │    └─ ThrowStatement
       └─ ReturnStatement
```

**Detection:** Null/undefined comparison + throw + return.

---

## Pattern 95: Bounds-Check

**Shape:** Validate value within bounds → throw if out

**Skeleton:**
```
function assertInRange(value: number, min: number, max: number): number {
  if (value < min || value > max) {
    throw new RangeError(`Value ${value} not in range [${min}, ${max}]`);
  }
  return value;
}
```

**Variants:**
- Inclusive vs exclusive bounds
- Clamp instead of throw
- Multiple dimensions

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ IfStatement (< min || > max)
       │    └─ ThrowStatement (RangeError)
       └─ ReturnStatement
```

**Detection:** Range comparison + RangeError throw + return.

---

## Pattern 96: Enum-Validate

**Shape:** Check value is valid enum member → return typed

**Skeleton:**
```
function assertValidStatus(value: string): Status {
  const valid = ['pending', 'active', 'completed'] as const;
  if (!valid.includes(value as Status)) {
    throw new Error(`Invalid status: ${value}`);
  }
  return value as Status;
}
```

**Variants:**
- String vs numeric enums
- Object.values check
- With default

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (valid values array)
       ├─ IfStatement (negated .includes)
       │    └─ ThrowStatement
       └─ ReturnStatement (as cast)
```

**Detection:** Valid values array + .includes check + throw + cast return.

---

## Pattern 97: Format-Validate

**Shape:** Check string matches format → return if valid

**Skeleton:**
```
function validateEmail(value: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    throw new Error('Invalid email format');
  }
  return value;
}
```

**Variants:**
- Different format patterns
- With normalization
- Multiple formats

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (RegExpLiteral)
       ├─ IfStatement (negated .test)
       │    └─ ThrowStatement
       └─ ReturnStatement
```

**Detection:** Regex variable + .test() check + throw + return.

---

## Pattern 98: Length-Validate

**Shape:** Check length within bounds → throw if violated

**Skeleton:**
```
function validateLength(value: string, min: number, max: number): string {
  if (value.length < min) {
    throw new Error(`Too short: minimum ${min} characters`);
  }
  if (value.length > max) {
    throw new Error(`Too long: maximum ${max} characters`);
  }
  return value;
}
```

**Variants:**
- Array length
- Exact length
- With trimming

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ IfStatement (.length < min)
       │    └─ ThrowStatement
       ├─ IfStatement (.length > max)
       │    └─ ThrowStatement
       └─ ReturnStatement
```

**Detection:** .length comparisons + throws + return.

---

## Pattern 99: Composite-Validate

**Shape:** Run multiple validators → collect all errors

**Skeleton:**
```
function validateAll(value: unknown, validators: Validator[]): ValidationResult {
  const errors = [];
  for (const validator of validators) {
    const result = validator(value);
    if (!result.valid) {
      errors.push(result.error);
    }
  }
  return errors.length === 0 
    ? { valid: true, value } 
    : { valid: false, errors };
}
```

**Variants:**
- Short-circuit on first error
- Error aggregation
- Async validators

**AST Signature:**
```
FunctionDeclaration (param: validators array)
  └─ BlockStatement
       ├─ VariableDeclaration (errors array)
       ├─ ForOfStatement (validators)
       │    └─ IfStatement (negated valid)
       │         └─ ExpressionStatement (errors.push)
       └─ ReturnStatement (ConditionalExpression)
```

**Detection:** Errors array + loop over validators + push errors + conditional return.

---

## Pattern 100: Sanitize-Validate

**Shape:** Clean input → validate cleaned → return sanitized

**Skeleton:**
```
function sanitize(input: string): string {
  const cleaned = input.trim().toLowerCase();
  if (cleaned.length === 0) {
    throw new Error('Input cannot be empty');
  }
  if (!/^[a-z0-9]+$/.test(cleaned)) {
    throw new Error('Invalid characters');
  }
  return cleaned;
}
```

**Variants:**
- HTML sanitization
- SQL escaping
- Path normalization

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (chained string methods)
       ├─ IfStatement (length check)
       │    └─ ThrowStatement
       ├─ IfStatement (format check)
       │    └─ ThrowStatement
       └─ ReturnStatement (cleaned)
```

**Detection:** Transform chain + validation checks + throws + return transformed.
