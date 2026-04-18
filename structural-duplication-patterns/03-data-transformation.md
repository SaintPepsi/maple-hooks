# Data Transformation Patterns (31-45)

Structural duplication in mapping, filtering, reducing, and accumulating data.

---

## Pattern 31: Map-Transform

**Shape:** Iterate collection → transform each item → return new collection

**Skeleton:**
```
function transform(items) {
  return items.map(item => process(item));
}
```

**Variants:**
- `.map()` vs manual loop
- Different transformation functions
- Chained maps

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ ReturnStatement
            └─ CallExpression
                 ├─ callee: MemberExpression (.map)
                 └─ arguments: [ArrowFunctionExpression]
```

**Detection:** ReturnStatement with CallExpression(.map) containing ArrowFunctionExpression.

---

## Pattern 32: Filter-Predicate

**Shape:** Iterate collection → keep items matching predicate

**Skeleton:**
```
function select(items) {
  return items.filter(item => isValid(item));
}
```

**Variants:**
- `.filter()` vs manual loop with accumulator
- Different predicate functions
- Negated predicates

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ ReturnStatement
            └─ CallExpression
                 ├─ callee: MemberExpression (.filter)
                 └─ arguments: [ArrowFunctionExpression]
```

**Detection:** ReturnStatement with CallExpression(.filter).

---

## Pattern 33: Reduce-Accumulate

**Shape:** Iterate → accumulate into single value

**Skeleton:**
```
function sum(items) {
  return items.reduce((acc, item) => acc + item.value, 0);
}
```

**Variants:**
- Different accumulator types (number, object, array)
- Different combining operations
- Initial value variations

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ ReturnStatement
            └─ CallExpression
                 ├─ callee: MemberExpression (.reduce)
                 └─ arguments: [ArrowFunctionExpression, Literal]
```

**Detection:** CallExpression(.reduce) with two-parameter ArrowFunctionExpression.

---

## Pattern 34: Group-By-Key

**Shape:** Iterate → extract key → accumulate into groups

**Skeleton:**
```
function groupBy(items, keyFn) {
  const groups = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}
```

**Variants:**
- Map vs object accumulator
- Different key extraction methods
- With/without default group

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (ObjectExpression: {})
       ├─ ForOfStatement
       │    └─ BlockStatement
       │         ├─ VariableDeclaration (CallExpression)
       │         ├─ IfStatement (test: negated MemberExpression)
       │         │    └─ AssignmentExpression (ArrayExpression)
       │         └─ ExpressionStatement (CallExpression: .push)
       └─ ReturnStatement
```

**Detection:** Object init + ForLoop + key extraction + conditional array init + push.

---

## Pattern 35: Unique-Deduplicate

**Shape:** Collect unique values from collection

**Skeleton:**
```
function unique(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}
```

**Variants:**
- Set vs object for tracking
- With/without order preservation
- By key vs by value

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (NewExpression: Set)
       ├─ VariableDeclaration (ArrayExpression)
       ├─ ForOfStatement
       │    └─ BlockStatement
       │         └─ IfStatement (test: negated .has())
       │              └─ BlockStatement
       │                   ├─ ExpressionStatement (.add)
       │                   └─ ExpressionStatement (.push)
       └─ ReturnStatement
```

**Detection:** Set creation + loop + !.has() check + .add() + accumulate.

---

## Pattern 36: Sort-Compare

**Shape:** Sort collection by comparison function

**Skeleton:**
```
function sortBy(items, key) {
  return [...items].sort((a, b) => {
    if (a[key] < b[key]) return -1;
    if (a[key] > b[key]) return 1;
    return 0;
  });
}
```

**Variants:**
- Ascending vs descending
- Single vs multiple keys
- Numeric vs string comparison

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ ReturnStatement
            └─ CallExpression
                 ├─ callee: MemberExpression (.sort)
                 └─ arguments: [ArrowFunctionExpression]
                      └─ body: BlockStatement
                           ├─ IfStatement (BinaryExpression: <)
                           │    └─ ReturnStatement (-1)
                           ├─ IfStatement (BinaryExpression: >)
                           │    └─ ReturnStatement (1)
                           └─ ReturnStatement (0)
```

**Detection:** .sort() with comparator function containing <, > comparisons and -1, 0, 1 returns.

---

## Pattern 37: Flatten-Nested

**Shape:** Flatten nested collection into single level

**Skeleton:**
```
function flatten(arrays) {
  const result = [];
  for (const arr of arrays) {
    for (const item of arr) {
      result.push(item);
    }
  }
  return result;
}
```

**Variants:**
- `.flat()` vs `.flatMap()` vs manual
- Recursive vs single-level
- With transformation

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (ArrayExpression)
       ├─ ForOfStatement
       │    └─ BlockStatement
       │         └─ ForOfStatement
       │              └─ BlockStatement
       │                   └─ ExpressionStatement (.push)
       └─ ReturnStatement
```

**Detection:** Nested ForStatements with innermost containing .push().

---

## Pattern 38: Zip-Combine

**Shape:** Combine multiple arrays element-wise

**Skeleton:**
```
function zip(a, b) {
  const result = [];
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    result.push([a[i], b[i]]);
  }
  return result;
}
```

**Variants:**
- Two vs multiple arrays
- Tuple vs object combination
- With/without length handling

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (ArrayExpression)
       ├─ VariableDeclaration (CallExpression: Math.min)
       ├─ ForStatement (i < len)
       │    └─ BlockStatement
       │         └─ ExpressionStatement (.push ArrayExpression)
       └─ ReturnStatement
```

**Detection:** Math.min on lengths + indexed loop + push array/tuple.

---

## Pattern 39: Partition-Split

**Shape:** Split collection into two based on predicate

**Skeleton:**
```
function partition(items, predicate) {
  const pass = [];
  const fail = [];
  for (const item of items) {
    if (predicate(item)) {
      pass.push(item);
    } else {
      fail.push(item);
    }
  }
  return [pass, fail];
}
```

**Variants:**
- Two vs multiple partitions
- Return tuple vs object
- With transformation

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (ArrayExpression)
       ├─ VariableDeclaration (ArrayExpression)
       ├─ ForOfStatement
       │    └─ BlockStatement
       │         └─ IfStatement
       │              ├─ consequent: .push to pass
       │              └─ alternate: .push to fail
       └─ ReturnStatement (ArrayExpression)
```

**Detection:** Two array inits + loop + if-else pushing to different arrays + return tuple.

---

## Pattern 40: Index-Build

**Shape:** Build lookup map from collection

**Skeleton:**
```
function indexBy(items, keyFn) {
  const index = new Map();
  for (const item of items) {
    index.set(keyFn(item), item);
  }
  return index;
}
```

**Variants:**
- Map vs object
- Single vs multiple keys
- Value transformation

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (NewExpression: Map)
       ├─ ForOfStatement
       │    └─ BlockStatement
       │         └─ ExpressionStatement (CallExpression: .set)
       └─ ReturnStatement
```

**Detection:** Map/object init + loop + .set() with key function + return.

---

## Pattern 41: Pick-Properties

**Shape:** Extract subset of properties from object

**Skeleton:**
```
function pick(obj, keys) {
  const result = {};
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}
```

**Variants:**
- Different key sources (array, arguments)
- With/without undefined handling
- Nested property picking

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (ObjectExpression)
       ├─ ForOfStatement
       │    └─ BlockStatement
       │         └─ IfStatement (BinaryExpression: in)
       │              └─ AssignmentExpression
       └─ ReturnStatement
```

**Detection:** Object init + loop over keys + `in` check + property copy.

---

## Pattern 42: Omit-Properties

**Shape:** Copy object excluding certain properties

**Skeleton:**
```
function omit(obj, keys) {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}
```

**Variants:**
- Delete vs filter during copy
- Set vs array for exclusion
- Deep vs shallow omit

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (ObjectExpression: SpreadElement)
       ├─ ForOfStatement
       │    └─ BlockStatement
       │         └─ ExpressionStatement (UnaryExpression: delete)
       └─ ReturnStatement
```

**Detection:** Spread copy + loop with delete expressions.

---

## Pattern 43: Deep-Clone

**Shape:** Recursively copy object/array

**Skeleton:**
```
function clone(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(item => clone(item));
  }
  const result = {};
  for (const key in value) {
    result[key] = clone(value[key]);
  }
  return result;
}
```

**Variants:**
- Handle Date, Map, Set specially
- With/without prototype preservation
- Circular reference handling

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ IfStatement (primitive check)
       │    └─ ReturnStatement
       ├─ IfStatement (Array.isArray)
       │    └─ ReturnStatement (.map with recursive call)
       ├─ VariableDeclaration (ObjectExpression)
       ├─ ForInStatement
       │    └─ AssignmentExpression (recursive call)
       └─ ReturnStatement
```

**Detection:** Recursive function with primitive check, Array.isArray branch, and object iteration.

---

## Pattern 44: Merge-Deep

**Shape:** Deep merge multiple objects

**Skeleton:**
```
function merge(target, source) {
  for (const key of Object.keys(source)) {
    if (isObject(target[key]) && isObject(source[key])) {
      merge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
```

**Variants:**
- Multiple sources
- Array handling strategies
- Immutable vs mutable

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ ForOfStatement (Object.keys)
       │    └─ BlockStatement
       │         └─ IfStatement (isObject checks)
       │              ├─ consequent: recursive call
       │              └─ alternate: assignment
       └─ ReturnStatement
```

**Detection:** Object.keys loop with isObject checks and recursive call branch.

---

## Pattern 45: Transform-Entries

**Shape:** Transform object via entries mapping

**Skeleton:**
```
function mapValues(obj, fn) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, fn(v)])
  );
}
```

**Variants:**
- Map keys vs values vs both
- Filter entries
- Nested transformation

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ ReturnStatement
            └─ CallExpression (Object.fromEntries)
                 └─ arguments:
                      └─ CallExpression (.map)
                           └─ callee: MemberExpression
                                └─ object: CallExpression (Object.entries)
```

**Detection:** Object.fromEntries(Object.entries(...).map(...)) chain.
