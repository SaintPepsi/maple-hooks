# I/O Operations Patterns (46-60)

Structural duplication in file, network, and database access.

---

## Pattern 46: Read-Parse-Return

**Shape:** Read data → parse format → return parsed

**Skeleton:**
```
function loadConfig(path) {
  const content = readFile(path);
  const parsed = JSON.parse(content);
  return parsed;
}
```

**Variants:**
- JSON vs YAML vs TOML vs XML
- Different read functions
- With/without error handling

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (CallExpression: readFile)
       ├─ VariableDeclaration (CallExpression: JSON.parse)
       └─ ReturnStatement
```

**Detection:** Read call + parse call + return sequence.

---

## Pattern 47: Check-Exists-Read

**Shape:** Check if resource exists → read if exists → return default otherwise

**Skeleton:**
```
function loadOrDefault(path, defaultValue) {
  if (!exists(path)) return defaultValue;
  const content = readFile(path);
  return parse(content);
}
```

**Variants:**
- fileExists vs fs.existsSync vs try-read
- Different default strategies
- With/without caching

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ IfStatement (negated exists check)
       │    └─ ReturnStatement (default)
       ├─ VariableDeclaration (read call)
       └─ ReturnStatement (processed)
```

**Detection:** !exists() early return + read + return pattern.

---

## Pattern 48: Ensure-Directory-Write

**Shape:** Ensure directory exists → write file

**Skeleton:**
```
function saveConfig(path, data) {
  ensureDir(dirname(path));
  writeFile(path, JSON.stringify(data));
}
```

**Variants:**
- mkdir -p vs ensureDir
- Different serialization formats
- Atomic write patterns

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ ExpressionStatement (CallExpression: ensureDir/mkdir)
       └─ ExpressionStatement (CallExpression: writeFile)
```

**Detection:** ensureDir/mkdir call followed by write call.

---

## Pattern 49: Read-Modify-Write

**Shape:** Read current state → modify → write back

**Skeleton:**
```
function updateConfig(path, updates) {
  const current = readJson(path) ?? {};
  const merged = { ...current, ...updates };
  writeJson(path, merged);
  return merged;
}
```

**Variants:**
- Merge vs replace
- Atomic vs non-atomic
- With locking

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (read call)
       ├─ VariableDeclaration (merge/transform)
       ├─ ExpressionStatement (write call)
       └─ ReturnStatement
```

**Detection:** Read + transform + write + return sequence.

---

## Pattern 50: Append-Log-Entry

**Shape:** Format entry → append to log file

**Skeleton:**
```
function logEvent(event) {
  const entry = JSON.stringify({ ts: Date.now(), ...event });
  appendFile(LOG_PATH, entry + '\n');
}
```

**Variants:**
- JSONL vs CSV vs plain text
- With/without timestamp
- Sync vs async append

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (JSON.stringify with timestamp)
       └─ ExpressionStatement (CallExpression: appendFile)
```

**Detection:** Stringify with timestamp + appendFile pattern.

---

## Pattern 51: Walk-Directory-Recursive

**Shape:** Read directory → filter → recurse into subdirs → accumulate

**Skeleton:**
```
function findFiles(dir, pattern) {
  const results = [];
  for (const entry of readdir(dir)) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(path, pattern));
    } else if (pattern.test(entry.name)) {
      results.push(path);
    }
  }
  return results;
}
```

**Variants:**
- Sync vs async iteration
- Different filter predicates
- Depth limiting

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (ArrayExpression)
       ├─ ForOfStatement (readdir)
       │    └─ BlockStatement
       │         └─ IfStatement (isDirectory)
       │              ├─ consequent: recursive push
       │              └─ alternate: conditional push
       └─ ReturnStatement
```

**Detection:** Recursive function with readdir loop, isDirectory check, recursive call.

---

## Pattern 52: Fetch-Retry-Timeout

**Shape:** Attempt fetch → retry on failure → timeout

**Skeleton:**
```
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { timeout: 5000 });
      return await response.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}
```

**Variants:**
- Different retry strategies
- Different timeout values
- Circuit breaker integration

**AST Signature:**
```
FunctionDeclaration (async: true)
  └─ BlockStatement
       └─ ForStatement
            └─ TryStatement
                 ├─ block: fetch + return
                 └─ handler: conditional throw + sleep
```

**Detection:** Async loop with try-catch containing fetch, conditional rethrow, sleep.

---

## Pattern 53: Stream-Transform-Write

**Shape:** Create read stream → transform → write stream

**Skeleton:**
```
function processFile(input, output) {
  const readStream = createReadStream(input);
  const writeStream = createWriteStream(output);
  readStream
    .pipe(transform())
    .pipe(writeStream);
}
```

**Variants:**
- Different transform stages
- Error handling on streams
- Async/await vs pipes

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (createReadStream)
       ├─ VariableDeclaration (createWriteStream)
       └─ ExpressionStatement
            └─ CallExpression (.pipe chain)
```

**Detection:** Stream creation + .pipe() chain pattern.

---

## Pattern 54: Batch-Process-Items

**Shape:** Split into batches → process each batch → combine results

**Skeleton:**
```
async function processBatched(items, batchSize = 10) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(process));
    results.push(...batchResults);
  }
  return results;
}
```

**Variants:**
- Different batch sizes
- Sequential vs parallel within batch
- With rate limiting

**AST Signature:**
```
FunctionDeclaration (async: true)
  └─ BlockStatement
       ├─ VariableDeclaration (results array)
       ├─ ForStatement (i += batchSize)
       │    └─ BlockStatement
       │         ├─ VariableDeclaration (.slice batch)
       │         ├─ VariableDeclaration (await Promise.all)
       │         └─ ExpressionStatement (results.push)
       └─ ReturnStatement
```

**Detection:** Loop with step > 1, .slice(), Promise.all, accumulate.

---

## Pattern 55: Cache-Check-Fetch

**Shape:** Check cache → return if cached → fetch if not → cache result

**Skeleton:**
```
async function getCached(key) {
  const cached = cache.get(key);
  if (cached) return cached;
  const fresh = await fetchData(key);
  cache.set(key, fresh);
  return fresh;
}
```

**Variants:**
- Different cache implementations
- TTL-based invalidation
- Stale-while-revalidate

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (cache.get)
       ├─ IfStatement (cached truthy)
       │    └─ ReturnStatement (cached)
       ├─ VariableDeclaration (fetch)
       ├─ ExpressionStatement (cache.set)
       └─ ReturnStatement (fresh)
```

**Detection:** cache.get + early return + fetch + cache.set + return.

---

## Pattern 56: Connection-Pool-Execute

**Shape:** Get connection → execute → release

**Skeleton:**
```
async function query(sql, params) {
  const conn = await pool.acquire();
  try {
    return await conn.execute(sql, params);
  } finally {
    pool.release(conn);
  }
}
```

**Variants:**
- Different resource pools
- Timeout on acquire
- Transaction handling

**AST Signature:**
```
FunctionDeclaration (async: true)
  └─ BlockStatement
       ├─ VariableDeclaration (await pool.acquire)
       └─ TryStatement
            ├─ block: return await execute
            └─ finalizer: pool.release
```

**Detection:** pool.acquire + try-finally with release pattern.

---

## Pattern 57: Paginated-Fetch-All

**Shape:** Fetch page → accumulate → fetch next until done

**Skeleton:**
```
async function fetchAll(baseUrl) {
  const results = [];
  let cursor = null;
  do {
    const page = await fetch(baseUrl + (cursor ? `?cursor=${cursor}` : ''));
    results.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return results;
}
```

**Variants:**
- Cursor vs offset pagination
- Different termination conditions
- Parallel page fetching

**AST Signature:**
```
FunctionDeclaration (async: true)
  └─ BlockStatement
       ├─ VariableDeclaration (results array)
       ├─ VariableDeclaration (cursor = null)
       ├─ DoWhileStatement
       │    └─ BlockStatement
       │         ├─ VariableDeclaration (await fetch)
       │         ├─ ExpressionStatement (results.push)
       │         └─ AssignmentExpression (cursor = next)
       └─ ReturnStatement
```

**Detection:** do-while with fetch, accumulate, cursor update pattern.

---

## Pattern 58: Lock-Operation-Unlock

**Shape:** Acquire lock → perform operation → release lock

**Skeleton:**
```
async function withLock(key, fn) {
  await lock.acquire(key);
  try {
    return await fn();
  } finally {
    await lock.release(key);
  }
}
```

**Variants:**
- Different lock implementations
- Timeout on acquire
- Reentrant vs exclusive

**AST Signature:**
```
FunctionDeclaration (async: true)
  └─ BlockStatement
       ├─ ExpressionStatement (await lock.acquire)
       └─ TryStatement
            ├─ block: return await fn()
            └─ finalizer: await lock.release
```

**Detection:** lock.acquire + try-finally with lock.release.

---

## Pattern 59: Transactional-Execute

**Shape:** Begin transaction → execute operations → commit or rollback

**Skeleton:**
```
async function transaction(fn) {
  await db.begin();
  try {
    const result = await fn();
    await db.commit();
    return result;
  } catch (e) {
    await db.rollback();
    throw e;
  }
}
```

**Variants:**
- Nested transactions
- Savepoints
- Isolation levels

**AST Signature:**
```
FunctionDeclaration (async: true)
  └─ BlockStatement
       ├─ ExpressionStatement (await db.begin)
       └─ TryStatement
            ├─ block: fn + commit + return
            └─ handler: rollback + throw
```

**Detection:** begin + try with commit + catch with rollback.

---

## Pattern 60: Temp-File-Operation

**Shape:** Create temp file → use → cleanup

**Skeleton:**
```
async function withTempFile(fn) {
  const tmpPath = tempfile();
  try {
    return await fn(tmpPath);
  } finally {
    await unlink(tmpPath);
  }
}
```

**Variants:**
- Temp directory vs file
- Sync vs async cleanup
- Named vs anonymous temp

**AST Signature:**
```
FunctionDeclaration
  └─ BlockStatement
       ├─ VariableDeclaration (tempfile/mktemp)
       └─ TryStatement
            ├─ block: fn(tmpPath)
            └─ finalizer: unlink/rmdir
```

**Detection:** temp creation + try-finally with cleanup.
