# State Management Patterns (61-75)

Structural duplication in caching, singletons, and state machines.

---

## Pattern 61: Singleton-Lazy-Init

**Shape:** Check if instance exists → create if not → return instance

**Skeleton:**
```
let instance = null;
function getInstance() {
  if (!instance) {
    instance = createInstance();
  }
  return instance;
}
```

**Variants:**
- Module-level vs class-level
- Thread-safe variants
- With initialization params

**AST Signature:**
```
VariableDeclaration (let, null)
FunctionDeclaration
  └─ BlockStatement
       ├─ IfStatement (negated instance)
       │    └─ AssignmentExpression (create)
       └─ ReturnStatement (instance)
```

**Detection:** Module-level null variable + function with !var check + assignment + return.

---

## Pattern 62: Memoize-By-Key

**Shape:** Check cache by key → return cached → compute and cache if miss

**Skeleton:**
```
const cache = new Map();
function memoized(key, compute) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  const result = compute();
  cache.set(key, result);
  return result;
}
```

**Variants:**
- Map vs WeakMap vs object
- With TTL expiration
- Multiple key arguments

**AST Signature:**
```
VariableDeclaration (Map)
FunctionDeclaration
  └─ BlockStatement
       ├─ IfStatement (cache.has)
       │    └─ ReturnStatement (cache.get)
       ├─ VariableDeclaration (compute)
       ├─ ExpressionStatement (cache.set)
       └─ ReturnStatement
```

**Detection:** Map + .has() early return + compute + .set() + return.

---

## Pattern 63: State-Machine-Transition

**Shape:** Check current state → validate transition → update state

**Skeleton:**
```
function transition(current, event) {
  const transitions = {
    idle: { start: 'running' },
    running: { pause: 'paused', stop: 'idle' },
    paused: { resume: 'running', stop: 'idle' }
  };
  const next = transitions[current]?.[event];
  if (!next) throw new Error('Invalid transition');
  return next;
}
```

**Variants:**
- Table-driven vs switch-case
- With side effects
- Hierarchical states

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (transitions object)
       ├─ VariableDeclaration (lookup)
       ├─ IfStatement (negated next)
       │    └─ ThrowStatement
       └─ ReturnStatement (next)
```

**Detection:** State table + lookup + validation + return next state.

---

## Pattern 64: Observer-Notify

**Shape:** Maintain listener list → notify all on change

**Skeleton:**
```
const listeners = [];
function subscribe(fn) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx > -1) listeners.splice(idx, 1);
  };
}
function notify(data) {
  listeners.forEach(fn => fn(data));
}
```

**Variants:**
- Sync vs async notification
- With priority ordering
- Event filtering

**AST Signature:**
```
VariableDeclaration (listeners array)
FunctionDeclaration (subscribe)
  └─ BlockStatement
       ├─ ExpressionStatement (push)
       └─ ReturnStatement (ArrowFunction: unsubscribe)
FunctionDeclaration (notify)
  └─ BlockStatement
       └─ ExpressionStatement (forEach)
```

**Detection:** Listener array + subscribe with push and unsubscribe return + notify with forEach.

---

## Pattern 65: Counter-Increment

**Shape:** Maintain counter → increment → return new value

**Skeleton:**
```
let counter = 0;
function nextId() {
  return ++counter;
}
```

**Variants:**
- Pre vs post increment
- With prefix
- Atomic operations

**AST Signature:**
```
VariableDeclaration (let, NumericLiteral: 0)
FunctionDeclaration
  └─ BlockStatement
       └─ ReturnStatement
            └─ UpdateExpression (++counter)
```

**Detection:** Numeric variable + function returning increment.

---

## Pattern 66: Flag-Toggle

**Shape:** Boolean flag → toggle function → check function

**Skeleton:**
```
let enabled = false;
function enable() { enabled = true; }
function disable() { enabled = false; }
function isEnabled() { return enabled; }
```

**Variants:**
- Toggle vs explicit set
- With callbacks
- Tri-state

**AST Signature:**
```
VariableDeclaration (let, BooleanLiteral)
FunctionDeclaration (enable)
  └─ AssignmentExpression (true)
FunctionDeclaration (disable)
  └─ AssignmentExpression (false)
FunctionDeclaration (isEnabled)
  └─ ReturnStatement (flag)
```

**Detection:** Boolean variable + setter functions + getter function.

---

## Pattern 67: Queue-Enqueue-Dequeue

**Shape:** Maintain array → add to end → remove from front

**Skeleton:**
```
const queue = [];
function enqueue(item) {
  queue.push(item);
}
function dequeue() {
  return queue.shift();
}
```

**Variants:**
- Priority queue
- Bounded queue
- Async drain

**AST Signature:**
```
VariableDeclaration (array)
FunctionDeclaration (enqueue)
  └─ ExpressionStatement (.push)
FunctionDeclaration (dequeue)
  └─ ReturnStatement (.shift)
```

**Detection:** Array + push function + shift function.

---

## Pattern 68: Stack-Push-Pop

**Shape:** Maintain array → add to end → remove from end

**Skeleton:**
```
const stack = [];
function push(item) {
  stack.push(item);
}
function pop() {
  return stack.pop();
}
```

**Variants:**
- With peek
- Size-limited
- Type-safe

**AST Signature:**
```
VariableDeclaration (array)
FunctionDeclaration (push)
  └─ ExpressionStatement (.push)
FunctionDeclaration (pop)
  └─ ReturnStatement (.pop)
```

**Detection:** Array + push function + pop function.

---

## Pattern 69: Registry-Register-Lookup

**Shape:** Maintain map → register by key → lookup by key

**Skeleton:**
```
const registry = new Map();
function register(key, value) {
  registry.set(key, value);
}
function lookup(key) {
  return registry.get(key);
}
```

**Variants:**
- With validation
- Unregister support
- Hierarchical lookup

**AST Signature:**
```
VariableDeclaration (Map)
FunctionDeclaration (register)
  └─ ExpressionStatement (.set)
FunctionDeclaration (lookup)
  └─ ReturnStatement (.get)
```

**Detection:** Map + .set() function + .get() function.

---

## Pattern 70: History-Undo-Redo

**Shape:** Maintain past/future stacks → push on change → pop on undo

**Skeleton:**
```
const past = [];
const future = [];
function save(state) {
  past.push(state);
  future.length = 0;
}
function undo() {
  if (past.length === 0) return null;
  const state = past.pop();
  future.push(state);
  return state;
}
```

**Variants:**
- Size-limited history
- Compound actions
- Persistent history

**AST Signature:**
```
VariableDeclaration (past array)
VariableDeclaration (future array)
FunctionDeclaration (save)
  └─ BlockStatement
       ├─ ExpressionStatement (past.push)
       └─ AssignmentExpression (future.length = 0)
FunctionDeclaration (undo)
  └─ BlockStatement
       ├─ IfStatement (length check)
       ├─ VariableDeclaration (past.pop)
       ├─ ExpressionStatement (future.push)
       └─ ReturnStatement
```

**Detection:** Two stack arrays + save clearing future + undo moving between stacks.

---

## Pattern 71: Debounce-Delay

**Shape:** Clear pending timer → set new timer → execute after delay

**Skeleton:**
```
let timer = null;
function debounced(fn, delay) {
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
```

**Variants:**
- Leading vs trailing edge
- With max wait
- Cancel support

**AST Signature:**
```
VariableDeclaration (timer = null)
FunctionDeclaration
  └─ ReturnStatement
       └─ ArrowFunctionExpression
            └─ BlockStatement
                 ├─ ExpressionStatement (clearTimeout)
                 └─ AssignmentExpression (setTimeout)
```

**Detection:** Timer variable + function returning function with clearTimeout + setTimeout.

---

## Pattern 72: Throttle-Rate-Limit

**Shape:** Check if enough time passed → execute → update timestamp

**Skeleton:**
```
let lastCall = 0;
function throttled(fn, limit) {
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return fn(...args);
    }
  };
}
```

**Variants:**
- Leading vs trailing
- With queue
- Per-key throttling

**AST Signature:**
```
VariableDeclaration (lastCall = 0)
FunctionDeclaration
  └─ ReturnStatement
       └─ ArrowFunctionExpression
            └─ BlockStatement
                 ├─ VariableDeclaration (Date.now)
                 └─ IfStatement (time check)
                      └─ BlockStatement
                           ├─ AssignmentExpression (lastCall)
                           └─ ReturnStatement (fn call)
```

**Detection:** Timestamp variable + function returning function with time difference check.

---

## Pattern 73: Reference-Count

**Shape:** Increment on acquire → decrement on release → cleanup at zero

**Skeleton:**
```
let refCount = 0;
let resource = null;
function acquire() {
  if (refCount === 0) resource = create();
  refCount++;
  return resource;
}
function release() {
  refCount--;
  if (refCount === 0) {
    cleanup(resource);
    resource = null;
  }
}
```

**Variants:**
- Weak references
- Async cleanup
- Debug tracking

**AST Signature:**
```
VariableDeclaration (refCount = 0)
VariableDeclaration (resource = null)
FunctionDeclaration (acquire)
  └─ BlockStatement
       ├─ IfStatement (refCount === 0)
       │    └─ create
       ├─ UpdateExpression (refCount++)
       └─ ReturnStatement
FunctionDeclaration (release)
  └─ BlockStatement
       ├─ UpdateExpression (refCount--)
       └─ IfStatement (refCount === 0)
            └─ cleanup + null
```

**Detection:** Counter + resource + acquire with conditional create + release with conditional cleanup.

---

## Pattern 74: Version-Compare-Update

**Shape:** Check version → update if newer → store new version

**Skeleton:**
```
let version = 0;
function update(newVersion, data) {
  if (newVersion <= version) return false;
  version = newVersion;
  applyUpdate(data);
  return true;
}
```

**Variants:**
- Semantic versioning
- Vector clocks
- Optimistic locking

**AST Signature:**
```
VariableDeclaration (version = 0)
FunctionDeclaration
  └─ BlockStatement
       ├─ IfStatement (newVersion <= version)
       │    └─ ReturnStatement (false)
       ├─ AssignmentExpression (version =)
       ├─ ExpressionStatement (apply)
       └─ ReturnStatement (true)
```

**Detection:** Version variable + function with <= check + assignment + return true.

---

## Pattern 75: Dirty-Flag-Track

**Shape:** Set dirty on modification → check dirty before expensive operation

**Skeleton:**
```
let dirty = false;
let cached = null;
function modify(value) {
  dirty = true;
  state = value;
}
function compute() {
  if (!dirty && cached !== null) return cached;
  cached = expensiveCompute();
  dirty = false;
  return cached;
}
```

**Variants:**
- Per-field dirty tracking
- Batch invalidation
- Dependency tracking

**AST Signature:**
```
VariableDeclaration (dirty = false)
VariableDeclaration (cached = null)
FunctionDeclaration (modify)
  └─ BlockStatement
       ├─ AssignmentExpression (dirty = true)
       └─ AssignmentExpression (state =)
FunctionDeclaration (compute)
  └─ BlockStatement
       ├─ IfStatement (!dirty && cached)
       │    └─ ReturnStatement (cached)
       ├─ AssignmentExpression (cached = compute)
       ├─ AssignmentExpression (dirty = false)
       └─ ReturnStatement
```

**Detection:** Dirty flag + cached value + modify sets dirty + compute checks dirty.
