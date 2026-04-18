// Pattern 58: Lock-Operation-Unlock
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Acquire lock -> perform operation -> release lock
// NOTE: Simplified version without try-finally per project standards

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface FileLock {
  acquire(): void;
  release(): void;
}

interface DatabaseMutex {
  lock(): void;
  unlock(): void;
}

interface RateLimitSemaphore {
  wait(): void;
  signal(): void;
}

const sharedFileLock: FileLock = {
  acquire: () => {},
  release: () => {},
};

const counterMutex: DatabaseMutex = {
  lock: () => {},
  unlock: () => {},
};

const apiSemaphore: RateLimitSemaphore = {
  wait: () => {},
  signal: () => {},
};

function writeSharedContent(_content: string): void {}
function incrementCounter(_delta: number): number { return 0; }
function invokeExternalApi<T>(_endpoint: string): T { return {} as T; }

// ============================================================================
// VARIANT A: Write with file lock
// ============================================================================

function lockedFileWrite(content: string): void {
  sharedFileLock.acquire();
  writeSharedContent(content);
  sharedFileLock.release();
}

// ============================================================================
// VARIANT B: Update counter with mutex
// ============================================================================

function lockedCounterIncrement(delta: number): number {
  counterMutex.lock();
  const result = incrementCounter(delta);
  counterMutex.unlock();
  return result;
}

// ============================================================================
// VARIANT C: API call with semaphore rate limiting
// ============================================================================

function rateLimitedApiCall<T>(endpoint: string): T {
  apiSemaphore.wait();
  const result = invokeExternalApi<T>(endpoint);
  apiSemaphore.signal();
  return result;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  lockedFileWrite,
  lockedCounterIncrement,
  rateLimitedApiCall,
};
