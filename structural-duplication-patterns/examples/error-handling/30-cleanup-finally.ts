// Pattern 30: Cleanup-Finally
// Shape: Acquire resource → use → cleanup in finally

interface Connection {
  execute(query: string): unknown[];
  close(): void;
}

interface FileHandle {
  read(): string;
  close(): void;
}

interface Lock {
  release(): void;
}

// Variant A
function withDatabaseConnection<T>(
  acquire: () => Connection,
  fn: (conn: Connection) => T,
): T {
  const connection = acquire();
  try {
    return fn(connection);
  } finally {
    connection.close();
  }
}

// Variant B
function withFileHandle<T>(
  acquire: () => FileHandle,
  fn: (handle: FileHandle) => T,
): T {
  const handle = acquire();
  try {
    return fn(handle);
  } finally {
    handle.close();
  }
}

// Variant C
function withLock<T>(acquire: () => Lock, fn: (lock: Lock) => T): T {
  const lock = acquire();
  try {
    return fn(lock);
  } finally {
    lock.release();
  }
}

export { withDatabaseConnection, withFileHandle, withLock };
