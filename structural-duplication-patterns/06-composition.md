# Composition Patterns (76-90)

Structural duplication in builders, factories, and dependency injection.

---

## Pattern 76: Builder-Fluent-Chain

**Shape:** Create builder → chain setters → call build

**Skeleton:**
```
function createBuilder() {
  const config = {};
  return {
    withA(value) { config.a = value; return this; },
    withB(value) { config.b = value; return this; },
    build() { return new Thing(config); }
  };
}
```

**Variants:**
- Class-based vs function-based
- Immutable vs mutable
- Required vs optional fields

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (config object)
       └─ ReturnStatement
            └─ ObjectExpression
                 ├─ MethodDefinition (setter returning this)
                 ├─ MethodDefinition (setter returning this)
                 └─ MethodDefinition (build)
```

**Detection:** Object with multiple methods returning `this` + build method.

---

## Pattern 77: Factory-Create

**Shape:** Accept config → instantiate correct type → return instance

**Skeleton:**
```
function createHandler(type, options) {
  switch (type) {
    case 'a': return new HandlerA(options);
    case 'b': return new HandlerB(options);
    default: throw new Error('Unknown type');
  }
}
```

**Variants:**
- Switch vs object lookup
- Registration-based
- With validation

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       └─ SwitchStatement
            ├─ SwitchCase
            │    └─ ReturnStatement (NewExpression)
            ├─ SwitchCase
            │    └─ ReturnStatement (NewExpression)
            └─ SwitchCase (default)
                 └─ ThrowStatement
```

**Detection:** Switch on type parameter returning NewExpressions.

---

## Pattern 78: Dependency-Inject-Default

**Shape:** Define deps interface → provide defaults → accept overrides

**Skeleton:**
```
const defaultDeps = {
  readFile: fs.readFile,
  writeFile: fs.writeFile
};
function service(deps = defaultDeps) {
  return { process: (x) => deps.readFile(x) };
}
```

**Variants:**
- Partial overrides with spread
- Type-safe interfaces
- Async initialization

**AST Signature:**
```
VariableDeclaration (defaultDeps object)
FunctionDeclaration (params: deps = defaultDeps)
  └─ ReturnStatement
       └─ ObjectExpression (using deps.*)
```

**Detection:** Default deps object + function with default parameter using deps.

---

## Pattern 79: Adapter-Wrap

**Shape:** Wrap external API → expose simplified interface

**Skeleton:**
```
function createAdapter(external) {
  return {
    doThing: (x) => external.complexMethod(x, DEFAULT_OPTIONS),
    getValue: () => external.getValueWithConfig(CONFIG)
  };
}
```

**Variants:**
- Sync to async conversion
- Error translation
- Result wrapping

**AST Signature:**
```
FunctionDeclaration (param: external)
  └─ ReturnStatement
       └─ ObjectExpression
            ├─ Property (ArrowFunction calling external.*)
            └─ Property (ArrowFunction calling external.*)
```

**Detection:** Function returning object with methods delegating to parameter.

---

## Pattern 80: Decorator-Wrap

**Shape:** Accept function → return enhanced function

**Skeleton:**
```
function withLogging(fn) {
  return (...args) => {
    console.log('Calling', fn.name);
    const result = fn(...args);
    console.log('Result', result);
    return result;
  };
}
```

**Variants:**
- Before/after/around advice
- Async decoration
- Multiple decorators

**AST Signature:**
```
FunctionDeclaration (param: fn)
  └─ ReturnStatement
       └─ ArrowFunctionExpression
            └─ BlockStatement
                 ├─ ExpressionStatement (logging)
                 ├─ VariableDeclaration (fn call)
                 ├─ ExpressionStatement (logging)
                 └─ ReturnStatement
```

**Detection:** Function returning function that calls the input function.

---

## Pattern 81: Compose-Pipeline

**Shape:** Combine multiple functions into pipeline

**Skeleton:**
```
function compose(...fns) {
  return (input) => fns.reduce((acc, fn) => fn(acc), input);
}
```

**Variants:**
- Left-to-right vs right-to-left
- Async compose
- With error handling

**AST Signature:**
```
FunctionDeclaration (rest param: fns)
  └─ ReturnStatement
       └─ ArrowFunctionExpression
            └─ CallExpression (.reduce)
```

**Detection:** Rest parameter + return function with reduce pattern.

---

## Pattern 82: Curry-Partial

**Shape:** Accept partial args → return function accepting rest

**Skeleton:**
```
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn(...args);
    }
    return (...more) => curried(...args, ...more);
  };
}
```

**Variants:**
- Auto-curry vs manual
- Placeholder support
- Arity detection

**AST Signature:**
```
FunctionDeclaration (param: fn)
  └─ ReturnStatement
       └─ FunctionExpression (curried, rest: args)
            └─ BlockStatement
                 ├─ IfStatement (args.length >= fn.length)
                 │    └─ ReturnStatement (fn call)
                 └─ ReturnStatement (ArrowFunction recursive)
```

**Detection:** Function returning recursive function with length check.

---

## Pattern 83: Middleware-Chain

**Shape:** Execute middleware in order → pass to next

**Skeleton:**
```
function createChain(middlewares) {
  return (ctx, next) => {
    let index = -1;
    function dispatch(i) {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;
      const fn = middlewares[i];
      if (!fn) return next?.();
      return fn(ctx, () => dispatch(i + 1));
    }
    return dispatch(0);
  };
}
```

**Variants:**
- Error handling middleware
- Async/await based
- With context mutation

**AST Signature:**
```
FunctionDeclaration (param: middlewares)
  └─ ReturnStatement
       └─ ArrowFunctionExpression
            └─ BlockStatement
                 ├─ VariableDeclaration (index)
                 ├─ FunctionDeclaration (dispatch)
                 │    └─ recursive call with i + 1
                 └─ ReturnStatement (dispatch(0))
```

**Detection:** Array parameter + nested dispatch function with recursive next call.

---

## Pattern 84: Plugin-Register

**Shape:** Accept plugin → validate → add to registry

**Skeleton:**
```
const plugins = [];
function register(plugin) {
  if (!plugin.name) throw new Error('Plugin must have name');
  if (plugins.some(p => p.name === plugin.name)) {
    throw new Error('Plugin already registered');
  }
  plugins.push(plugin);
}
```

**Variants:**
- With initialization hooks
- Priority ordering
- Conflict resolution

**AST Signature:**
```
VariableDeclaration (plugins array)
FunctionDeclaration (param: plugin)
  └─ BlockStatement
       ├─ IfStatement (validation)
       │    └─ ThrowStatement
       ├─ IfStatement (.some duplicate check)
       │    └─ ThrowStatement
       └─ ExpressionStatement (.push)
```

**Detection:** Array + function with validation throws + duplicate check + push.

---

## Pattern 85: Event-Emitter-Pattern

**Shape:** Store handlers by event → emit triggers all handlers

**Skeleton:**
```
const handlers = {};
function on(event, handler) {
  if (!handlers[event]) handlers[event] = [];
  handlers[event].push(handler);
}
function emit(event, data) {
  const list = handlers[event] || [];
  list.forEach(h => h(data));
}
```

**Variants:**
- Once listeners
- Wildcard events
- Async emit

**AST Signature:**
```
VariableDeclaration (handlers object)
FunctionDeclaration (on)
  └─ BlockStatement
       ├─ IfStatement (init array if needed)
       └─ ExpressionStatement (.push)
FunctionDeclaration (emit)
  └─ BlockStatement
       ├─ VariableDeclaration (handlers[event])
       └─ ExpressionStatement (.forEach)
```

**Detection:** Object + on function with push + emit function with forEach.

---

## Pattern 86: Strategy-Select

**Shape:** Map strategy name to implementation → execute selected

**Skeleton:**
```
const strategies = {
  fast: (data) => quickProcess(data),
  thorough: (data) => deepProcess(data)
};
function execute(strategyName, data) {
  const strategy = strategies[strategyName];
  if (!strategy) throw new Error('Unknown strategy');
  return strategy(data);
}
```

**Variants:**
- Class-based strategies
- Runtime registration
- With fallback

**AST Signature:**
```
VariableDeclaration (strategies object)
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (strategies[name])
       ├─ IfStatement (negated strategy)
       │    └─ ThrowStatement
       └─ ReturnStatement (strategy call)
```

**Detection:** Strategy object + function with lookup + validation + call.

---

## Pattern 87: Template-Method

**Shape:** Define skeleton → call abstract steps → subclass fills in

**Skeleton:**
```
function createProcessor(steps) {
  return {
    process(data) {
      const validated = steps.validate(data);
      const transformed = steps.transform(validated);
      return steps.finalize(transformed);
    }
  };
}
```

**Variants:**
- Hook methods
- Optional steps
- Before/after hooks

**AST Signature:**
```
FunctionDeclaration (param: steps)
  └─ ReturnStatement
       └─ ObjectExpression
            └─ MethodDefinition (process)
                 └─ BlockStatement
                      ├─ VariableDeclaration (steps.validate)
                      ├─ VariableDeclaration (steps.transform)
                      └─ ReturnStatement (steps.finalize)
```

**Detection:** Function accepting steps object, returning object that sequences step calls.

---

## Pattern 88: Proxy-Intercept

**Shape:** Wrap target → intercept operations → delegate or modify

**Skeleton:**
```
function createProxy(target) {
  return new Proxy(target, {
    get(obj, prop) {
      console.log('Accessing', prop);
      return obj[prop];
    },
    set(obj, prop, value) {
      console.log('Setting', prop, value);
      obj[prop] = value;
      return true;
    }
  });
}
```

**Variants:**
- Validation on set
- Lazy loading
- Access control

**AST Signature:**
```
FunctionDeclaration
  └─ ReturnStatement
       └─ NewExpression (Proxy)
            └─ arguments: [target, ObjectExpression]
                 ├─ Property (get handler)
                 └─ Property (set handler)
```

**Detection:** new Proxy with handler object containing trap methods.

---

## Pattern 89: Mixin-Extend

**Shape:** Copy properties from multiple sources to target

**Skeleton:**
```
function mixin(target, ...sources) {
  for (const source of sources) {
    for (const key of Object.keys(source)) {
      target[key] = source[key];
    }
  }
  return target;
}
```

**Variants:**
- Deep mixin
- With conflict resolution
- Method chaining

**AST Signature:**
```
FunctionDeclaration (target, ...sources)
  └─ BlockStatement
       ├─ ForOfStatement (sources)
       │    └─ ForOfStatement (Object.keys)
       │         └─ AssignmentExpression
       └─ ReturnStatement (target)
```

**Detection:** Rest parameter + nested loops copying properties.

---

## Pattern 90: Context-Provider

**Shape:** Store context value → provide to nested calls

**Skeleton:**
```
let currentContext = null;
function withContext(ctx, fn) {
  const prev = currentContext;
  currentContext = ctx;
  try {
    return fn();
  } finally {
    currentContext = prev;
  }
}
function getContext() {
  return currentContext;
}
```

**Variants:**
- Async context tracking
- Nested contexts
- Type-safe contexts

**AST Signature:**
```
VariableDeclaration (currentContext = null)
FunctionDeclaration (withContext)
  └─ BlockStatement
       ├─ VariableDeclaration (prev = current)
       ├─ AssignmentExpression (current = new)
       └─ TryStatement
            ├─ block: return fn()
            └─ finalizer: current = prev
FunctionDeclaration (getContext)
  └─ ReturnStatement (currentContext)
```

**Detection:** Context variable + withContext with save/restore in try-finally + getter.
