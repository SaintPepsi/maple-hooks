# Error Handling Patterns (16-30)

Structural duplication in exception handling, Result types, and fallbacks.

---

## Pattern 16: Try-Catch-Return-Default

**Shape:** Try operation → catch error → return default value

**Skeleton:**
```
function safeParse(input) {
  try {
    return JSON.parse(input);
  } catch {
    return DEFAULT;
  }
}
```

**Variants:**
- Different operations in try block
- Different default values
- With/without error logging

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ TryStatement
            ├─ block: BlockStatement
            │    └─ ReturnStatement
            └─ handler: CatchClause
                 └─ body: BlockStatement
                      └─ ReturnStatement (Literal|Identifier)
```

**Detection:** TryStatement where both try and catch blocks end with ReturnStatement.

---

## Pattern 17: Try-Catch-Rethrow-Wrapped

**Shape:** Try operation → catch → wrap error → rethrow

**Skeleton:**
```
function operation() {
  try {
    return doRiskyThing();
  } catch (e) {
    throw new CustomError("Context", e);
  }
}
```

**Variants:**
- Different error wrapper classes
- Different context messages
- With/without cause chaining

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ TryStatement
            ├─ block: BlockStatement
            │    └─ ReturnStatement
            └─ handler: CatchClause
                 └─ body: BlockStatement
                      └─ ThrowStatement (NewExpression)
```

**Detection:** TryStatement with CatchClause containing ThrowStatement with NewExpression.

---

## Pattern 18: Try-Catch-Log-Rethrow

**Shape:** Try operation → catch → log → rethrow original

**Skeleton:**
```
function operation() {
  try {
    return doThing();
  } catch (e) {
    console.error("Failed:", e);
    throw e;
  }
}
```

**Variants:**
- Different logging methods (console, logger, stderr)
- Different context in log message
- Additional cleanup before rethrow

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ TryStatement
            ├─ block: BlockStatement
            │    └─ ReturnStatement|ExpressionStatement
            └─ handler: CatchClause (param: e)
                 └─ body: BlockStatement
                      ├─ ExpressionStatement (CallExpression: console.*/logger.*)
                      └─ ThrowStatement (Identifier: e)
```

**Detection:** CatchClause with CallExpression followed by ThrowStatement of same error identifier.

---

## Pattern 19: Result-Ok-Check-Propagate

**Shape:** Call function → check .ok → propagate error or continue

**Skeleton:**
```
function pipeline(input) {
  const result = step1(input);
  if (!result.ok) return result;
  const next = step2(result.value);
  if (!next.ok) return next;
  return ok(next.value);
}
```

**Variants:**
- Different step functions
- Different number of steps
- `.ok` vs `.success` vs `.isOk()`

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration
       ├─ IfStatement (test: UnaryExpression(!), MemberExpression(.ok))
       │    └─ ReturnStatement (Identifier)
       ├─ VariableDeclaration
       ├─ IfStatement (test: UnaryExpression(!), MemberExpression(.ok))
       │    └─ ReturnStatement (Identifier)
       └─ ReturnStatement (CallExpression)
```

**Detection:** Alternating VariableDeclaration + IfStatement(!.ok) + ReturnStatement pattern.

---

## Pattern 20: Result-Map-Chain

**Shape:** Transform Result value through chain of operations

**Skeleton:**
```
function transform(input) {
  return getResult(input)
    .map(x => processA(x))
    .map(x => processB(x))
    .mapError(e => wrapError(e));
}
```

**Variants:**
- Different map functions
- Different chain lengths
- andThen vs map vs flatMap

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ ReturnStatement
            └─ CallExpression
                 └─ callee: MemberExpression (.map/.mapError)
                      └─ object: CallExpression
                           └─ callee: MemberExpression (.map)
                                └─ ...
```

**Detection:** Chained CallExpressions with .map/.mapError/.andThen method names.

---

## Pattern 21: Nullable-Safe-Access

**Shape:** Check null → access property → or return default

**Skeleton:**
```
function getValue(obj) {
  if (obj == null) return DEFAULT;
  if (obj.field == null) return DEFAULT;
  return obj.field.value;
}
```

**Variants:**
- `?.` optional chaining vs explicit checks
- Different depths of access
- Different null checks (== null, === undefined, !obj)

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ IfStatement (test: BinaryExpression(== null))
       │    └─ ReturnStatement
       └─ ReturnStatement (MemberExpression)
```

**Detection:** IfStatement(null-check) + ReturnStatement(default) before final MemberExpression return.

---

## Pattern 22: Error-Factory-Call

**Shape:** Create error with context → return as Result.err

**Skeleton:**
```
function validate(input) {
  if (!isValid(input)) {
    return err(invalidInput(input, "reason"));
  }
  return ok(input);
}
```

**Variants:**
- Different error factory functions
- Different context parameters
- Inline Error vs factory function

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ IfStatement
       │    └─ ReturnStatement
       │         └─ CallExpression (err)
       │              └─ arguments: [CallExpression (errorFactory)]
       └─ ReturnStatement (CallExpression: ok)
```

**Detection:** IfStatement with ReturnStatement containing nested CallExpression(err(factory())).

---

## Pattern 23: Fallback-Value-Chain

**Shape:** Try primary → fallback to secondary → fallback to default

**Skeleton:**
```
function resolve(primary, secondary) {
  if (primary != null) return primary;
  if (secondary != null) return secondary;
  return DEFAULT;
}
```

**Variants:**
- `??` vs explicit checks
- Different number of fallbacks
- Function calls vs values

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ IfStatement (test: != null)
       │    └─ ReturnStatement
       ├─ IfStatement (test: != null)
       │    └─ ReturnStatement
       └─ ReturnStatement (default)
```

**Detection:** Multiple IfStatement(non-null-check) + ReturnStatement, final default return.

---

## Pattern 24: Async-Try-Catch

**Shape:** Await async operation → catch → handle error

**Skeleton:**
```
async function fetch(url) {
  try {
    const response = await fetchData(url);
    return ok(response);
  } catch (e) {
    return err(networkError(e));
  }
}
```

**Variants:**
- Different async operations
- Different error wrapping
- Multiple awaits in try block

**AST Signature:**
```
FunctionDeclaration (async: true)
  └─ BlockStatement
       └─ TryStatement
            ├─ block: BlockStatement
            │    ├─ VariableDeclaration (init: AwaitExpression)
            │    └─ ReturnStatement
            └─ handler: CatchClause
                 └─ body: BlockStatement
                      └─ ReturnStatement
```

**Detection:** Async function with TryStatement containing AwaitExpression.

---

## Pattern 25: Promise-Catch-Chain

**Shape:** Promise.then().catch() pattern

**Skeleton:**
```
function fetch(url) {
  return fetchData(url)
    .then(response => process(response))
    .catch(error => handleError(error));
}
```

**Variants:**
- Different .then transformations
- Multiple .then calls
- .finally additions

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ ReturnStatement
            └─ CallExpression
                 └─ callee: MemberExpression (.catch)
                      └─ object: CallExpression
                           └─ callee: MemberExpression (.then)
```

**Detection:** Chained CallExpressions ending with .catch().

---

## Pattern 26: Validation-Or-Throw

**Shape:** Validate input → throw if invalid → continue

**Skeleton:**
```
function process(input) {
  if (!isValid(input)) {
    throw new ValidationError("Invalid input");
  }
  return transform(input);
}
```

**Variants:**
- Different validation conditions
- Different error types
- Multiple validations

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ IfStatement (test: negated)
       │    └─ ThrowStatement (NewExpression)
       └─ ReturnStatement
```

**Detection:** IfStatement with negated test containing ThrowStatement, followed by normal flow.

---

## Pattern 27: Assert-Precondition

**Shape:** Assert condition → proceed if true

**Skeleton:**
```
function divide(a, b) {
  assert(b !== 0, "Divisor cannot be zero");
  return a / b;
}
```

**Variants:**
- Different assertion functions (assert, invariant, check)
- Different error messages
- Multiple assertions

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ ExpressionStatement
       │    └─ CallExpression (callee: Identifier: assert/invariant)
       └─ ReturnStatement
```

**Detection:** CallExpression(assert) followed by main logic.

---

## Pattern 28: Error-Boundary-Wrapper

**Shape:** Wrap function call → catch any error → return safe value

**Skeleton:**
```
function safeCall(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
```

**Variants:**
- Different fallback strategies
- With/without error callback
- Sync vs async

**AST Signature:**
```
FunctionDeclaration (params: [fn, fallback])
  └─ BlockStatement
       └─ TryStatement
            ├─ block: BlockStatement
            │    └─ ReturnStatement (CallExpression: fn())
            └─ handler: CatchClause
                 └─ body: BlockStatement
                      └─ ReturnStatement (Identifier: fallback)
```

**Detection:** TryStatement with function parameter call in try, parameter return in catch.

---

## Pattern 29: Retry-With-Backoff

**Shape:** Attempt operation → on failure, wait → retry

**Skeleton:**
```
async function retryable(fn, attempts) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === attempts - 1) throw e;
      await sleep(backoff(i));
    }
  }
}
```

**Variants:**
- Different backoff strategies
- Different retry counts
- With/without jitter

**AST Signature:**
```
FunctionDeclaration (async: true)
  └─ BlockStatement
       └─ ForStatement
            └─ body: BlockStatement
                 └─ TryStatement
                      ├─ block: ReturnStatement (AwaitExpression)
                      └─ handler: CatchClause
                           └─ body: BlockStatement
                                ├─ IfStatement (ThrowStatement)
                                └─ ExpressionStatement (AwaitExpression: sleep)
```

**Detection:** ForStatement containing TryStatement with conditional rethrow and sleep.

---

## Pattern 30: Cleanup-Finally

**Shape:** Acquire resource → use → cleanup in finally

**Skeleton:**
```
function withResource(fn) {
  const resource = acquire();
  try {
    return fn(resource);
  } finally {
    release(resource);
  }
}
```

**Variants:**
- Different resource types
- With/without catch
- Async cleanup

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (CallExpression: acquire)
       └─ TryStatement
            ├─ block: BlockStatement
            │    └─ ReturnStatement
            └─ finalizer: BlockStatement
                 └─ ExpressionStatement (CallExpression: release)
```

**Detection:** TryStatement with finalizer block containing cleanup call using earlier-declared variable.
