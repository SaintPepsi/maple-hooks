# Control Flow Patterns (1-15)

Structural duplication in branching, loops, and early returns.

---

## Pattern 1: Guard-Clause-Early-Return

**Shape:** Check condition → return early → continue with main logic

**Skeleton:**
```
function process(input) {
  if (!CONDITION) return DEFAULT;
  // main logic
  return RESULT;
}
```

**Variants:**
- `if (!input) return null` vs `if (!data) return undefined`
- `if (x.length === 0) return []` vs `if (items.size === 0) return new Map()`

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ IfStatement (test: UnaryExpression|BinaryExpression)
       │    └─ ReturnStatement
       └─ ... (remaining statements)
       └─ ReturnStatement
```

**Detection:** IfStatement as first statement with single ReturnStatement body, no else branch.

---

## Pattern 2: Null-Check-Chain

**Shape:** Check multiple conditions in sequence, return on first failure

**Skeleton:**
```
function extract(obj) {
  if (!obj) return null;
  if (!obj.field) return null;
  if (!obj.field.nested) return null;
  return obj.field.nested.value;
}
```

**Variants:**
- Different object paths
- Different null representations (null, undefined, false)

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ IfStatement (ReturnStatement)
       ├─ IfStatement (ReturnStatement)
       ├─ IfStatement (ReturnStatement)
       └─ ReturnStatement
```

**Detection:** 2+ consecutive IfStatements each with single ReturnStatement, same return value.

---

## Pattern 3: Type-Switch-Dispatch

**Shape:** Check type/discriminator → branch to type-specific logic

**Skeleton:**
```
function handle(input) {
  if (input.type === "A") return handleA(input);
  if (input.type === "B") return handleB(input);
  if (input.type === "C") return handleC(input);
  return handleDefault(input);
}
```

**Variants:**
- `switch` vs chained `if`
- Different discriminator fields (type, kind, tag, event)
- Different handler names

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ IfStatement (BinaryExpression: ===)
       │    └─ ReturnStatement (CallExpression)
       ├─ IfStatement (BinaryExpression: ===)
       │    └─ ReturnStatement (CallExpression)
       └─ ReturnStatement (CallExpression)
```

**Detection:** 2+ IfStatements testing same member against different literals, each returning function call.

---

## Pattern 4: Conditional-Assignment

**Shape:** Initialize variable → conditionally reassign → use variable

**Skeleton:**
```
function compute(input) {
  let result = DEFAULT;
  if (CONDITION_A) {
    result = VALUE_A;
  } else if (CONDITION_B) {
    result = VALUE_B;
  }
  return result;
}
```

**Variants:**
- Different variable names and types
- Different condition expressions
- `switch` vs `if-else`

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (let)
       ├─ IfStatement
       │    ├─ BlockStatement (AssignmentExpression)
       │    └─ IfStatement (alternate)
       │         └─ BlockStatement (AssignmentExpression)
       └─ ReturnStatement (Identifier)
```

**Detection:** VariableDeclaration followed by IfStatement with AssignmentExpressions to same variable.

---

## Pattern 5: Loop-Accumulate

**Shape:** Initialize accumulator → iterate → update accumulator → return

**Skeleton:**
```
function collect(items) {
  const result = [];
  for (const item of items) {
    result.push(transform(item));
  }
  return result;
}
```

**Variants:**
- `for-of` vs `for-in` vs `forEach` vs `for (i=0; ...)`
- Array vs Set vs Map vs object accumulator
- push vs add vs set vs property assignment

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (const/let, ArrayExpression|ObjectExpression|NewExpression)
       ├─ ForOfStatement|ForInStatement|ForStatement
       │    └─ BlockStatement
       │         └─ ExpressionStatement (CallExpression: .push/.add/.set)
       └─ ReturnStatement (Identifier)
```

**Detection:** VariableDeclaration(collection) + Loop + MemberCall(add/push/set) + ReturnStatement(same-var).

---

## Pattern 6: Loop-Find-First

**Shape:** Iterate → check condition → return on first match → return default

**Skeleton:**
```
function find(items) {
  for (const item of items) {
    if (matches(item)) {
      return item;
    }
  }
  return null;
}
```

**Variants:**
- Different match conditions
- Different default values (null, undefined, -1, false)
- Return transformed item vs raw item

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ ForOfStatement
       │    └─ BlockStatement
       │         └─ IfStatement
       │              └─ ReturnStatement
       └─ ReturnStatement (NullLiteral|Identifier)
```

**Detection:** ForStatement containing IfStatement with ReturnStatement, followed by default ReturnStatement.

---

## Pattern 7: Loop-All-Match

**Shape:** Iterate → check condition → return false on mismatch → return true

**Skeleton:**
```
function allValid(items) {
  for (const item of items) {
    if (!isValid(item)) {
      return false;
    }
  }
  return true;
}
```

**Variants:**
- `every` vs manual loop
- Negated condition placement
- Different validation functions

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ ForOfStatement
       │    └─ BlockStatement
       │         └─ IfStatement (negated test)
       │              └─ ReturnStatement (BooleanLiteral: false)
       └─ ReturnStatement (BooleanLiteral: true)
```

**Detection:** Loop with negated-condition early-return false, final return true.

---

## Pattern 8: Loop-Any-Match

**Shape:** Iterate → check condition → return true on match → return false

**Skeleton:**
```
function hasAny(items) {
  for (const item of items) {
    if (matches(item)) {
      return true;
    }
  }
  return false;
}
```

**Variants:**
- `some` vs manual loop
- Different match predicates

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ ForOfStatement
       │    └─ BlockStatement
       │         └─ IfStatement
       │              └─ ReturnStatement (BooleanLiteral: true)
       └─ ReturnStatement (BooleanLiteral: false)
```

**Detection:** Loop with positive-condition early-return true, final return false.

---

## Pattern 9: Loop-Count

**Shape:** Initialize counter → iterate → increment on condition → return count

**Skeleton:**
```
function count(items) {
  let count = 0;
  for (const item of items) {
    if (matches(item)) {
      count++;
    }
  }
  return count;
}
```

**Variants:**
- Different counter names
- Different increment amounts
- Conditional vs unconditional increment

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (let, NumericLiteral: 0)
       ├─ ForOfStatement
       │    └─ BlockStatement
       │         └─ IfStatement
       │              └─ ExpressionStatement (UpdateExpression: ++)
       └─ ReturnStatement (Identifier)
```

**Detection:** VariableDeclaration(0) + Loop + UpdateExpression(++) + ReturnStatement(counter).

---

## Pattern 10: Ternary-Default

**Shape:** Return condition ? value : default

**Skeleton:**
```
function getValue(input) {
  return input ? input.value : DEFAULT;
}
```

**Variants:**
- Different conditions (truthy, comparison, function call)
- Different default values
- Nested ternaries

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ ReturnStatement
            └─ ConditionalExpression
                 ├─ test: Identifier|MemberExpression|CallExpression
                 ├─ consequent: MemberExpression|Identifier
                 └─ alternate: Literal|Identifier
```

**Detection:** Single ReturnStatement with ConditionalExpression.

---

## Pattern 11: Nullish-Coalesce-Chain

**Shape:** Return first non-null value in chain

**Skeleton:**
```
function resolve(a, b, c) {
  return a ?? b ?? c ?? DEFAULT;
}
```

**Variants:**
- `??` vs `||`
- Different number of fallbacks
- Function calls vs values

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ ReturnStatement
            └─ LogicalExpression (operator: ??)
                 └─ LogicalExpression (operator: ??)
                      └─ ...
```

**Detection:** Chained LogicalExpression with ?? or || operators.

---

## Pattern 12: Break-On-Condition

**Shape:** Loop until condition met, then break

**Skeleton:**
```
function process(items) {
  for (const item of items) {
    doSomething(item);
    if (shouldStop(item)) {
      break;
    }
  }
}
```

**Variants:**
- Different stop conditions
- Break vs return
- While vs for

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ ForOfStatement
            └─ BlockStatement
                 ├─ ExpressionStatement
                 └─ IfStatement
                      └─ BreakStatement
```

**Detection:** Loop containing IfStatement with BreakStatement.

---

## Pattern 13: Continue-On-Condition

**Shape:** Skip iteration on condition, continue with rest

**Skeleton:**
```
function process(items) {
  for (const item of items) {
    if (shouldSkip(item)) {
      continue;
    }
    doSomething(item);
  }
}
```

**Variants:**
- Different skip conditions
- Continue at start vs middle of loop body

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ ForOfStatement
            └─ BlockStatement
                 ├─ IfStatement
                 │    └─ ContinueStatement
                 └─ ExpressionStatement
```

**Detection:** Loop with IfStatement containing ContinueStatement.

---

## Pattern 14: Index-Loop-With-Bounds

**Shape:** Iterate with index, check bounds, access by index

**Skeleton:**
```
function process(arr) {
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    // use item
  }
}
```

**Variants:**
- Different bound expressions (length, size, count)
- Different increment patterns (i++, i += step)
- Reverse iteration

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ ForStatement
            ├─ init: VariableDeclaration (NumericLiteral: 0)
            ├─ test: BinaryExpression (<)
            ├─ update: UpdateExpression (++)
            └─ body: BlockStatement
                 └─ VariableDeclaration (MemberExpression[Identifier])
```

**Detection:** ForStatement with numeric init, < test on .length, ++ update, indexed access in body.

---

## Pattern 15: Nested-Loop-Search

**Shape:** Outer loop → inner loop → condition → early return

**Skeleton:**
```
function findPair(a, b) {
  for (const x of a) {
    for (const y of b) {
      if (matches(x, y)) {
        return [x, y];
      }
    }
  }
  return null;
}
```

**Variants:**
- Different nesting depths
- Different match conditions
- Return vs break

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ ForOfStatement
       │    └─ BlockStatement
       │         └─ ForOfStatement
       │              └─ BlockStatement
       │                   └─ IfStatement
       │                        └─ ReturnStatement
       └─ ReturnStatement
```

**Detection:** Nested ForStatements with IfStatement containing ReturnStatement.
