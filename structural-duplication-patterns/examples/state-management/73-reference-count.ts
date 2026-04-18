// Pattern 73: Reference-Count
// Track references and cleanup when count reaches zero

// Variant A: Resource reference counting
interface ManagedResource {
  id: string;
  data: unknown;
}

interface ResourceManager {
  acquire(resourceId: string): ManagedResource;
  release(resourceId: string): void;
  getRefCount(resourceId: string): number;
}

function createResourceManager(
  loader: (id: string) => unknown,
  cleanup: (resource: ManagedResource) => void
): ResourceManager {
  const resources = new Map<string, ManagedResource>();
  const refCounts = new Map<string, number>();

  return {
    acquire(resourceId: string): ManagedResource {
      const currentCount = refCounts.get(resourceId) ?? 0;

      if (currentCount === 0) {
        // First reference, load resource
        const data = loader(resourceId);
        resources.set(resourceId, { id: resourceId, data });
      }

      refCounts.set(resourceId, currentCount + 1);
      return resources.get(resourceId)!;
    },
    release(resourceId: string): void {
      const currentCount = refCounts.get(resourceId) ?? 0;
      if (currentCount <= 0) return;

      const newCount = currentCount - 1;
      refCounts.set(resourceId, newCount);

      if (newCount === 0) {
        // Last reference released, cleanup
        const resource = resources.get(resourceId);
        if (resource) {
          cleanup(resource);
          resources.delete(resourceId);
        }
        refCounts.delete(resourceId);
      }
    },
    getRefCount(resourceId: string): number {
      return refCounts.get(resourceId) ?? 0;
    },
  };
}

// Variant B: Connection pool with reference counting
interface PooledConnection {
  id: number;
  inUse: boolean;
  refCount: number;
  lastUsed: number;
}

class ConnectionPool {
  private connections: PooledConnection[] = [];
  private nextId = 0;
  private readonly maxConnections: number;

  constructor(maxConnections = 10) {
    this.maxConnections = maxConnections;
  }

  acquire(): PooledConnection | null {
    // Find existing connection with refCount > 0 or create new
    let connection = this.connections.find((c) => !c.inUse);

    if (!connection && this.connections.length < this.maxConnections) {
      connection = {
        id: this.nextId++,
        inUse: false,
        refCount: 0,
        lastUsed: Date.now(),
      };
      this.connections.push(connection);
    }

    if (connection) {
      connection.inUse = true;
      connection.refCount++;
      connection.lastUsed = Date.now();
      return connection;
    }

    return null; // Pool exhausted
  }

  release(connectionId: number): void {
    const connection = this.connections.find((c) => c.id === connectionId);
    if (!connection) return;

    connection.refCount--;
    if (connection.refCount <= 0) {
      connection.inUse = false;
      connection.refCount = 0;
    }
  }

  getStats(): { total: number; inUse: number; available: number } {
    const inUse = this.connections.filter((c) => c.inUse).length;
    return {
      total: this.connections.length,
      inUse,
      available: this.maxConnections - this.connections.length + (this.connections.length - inUse),
    };
  }
}

// Variant C: Shared buffer with reference counting
class SharedBuffer {
  private buffer: ArrayBuffer;
  private refCount = 0;
  private disposed = false;

  constructor(size: number) {
    this.buffer = new ArrayBuffer(size);
  }

  addRef(): void {
    if (this.disposed) {
      throw new Error("Cannot reference disposed buffer");
    }
    this.refCount++;
  }

  release(): void {
    if (this.refCount <= 0) return;

    this.refCount--;
    if (this.refCount === 0) {
      this.dispose();
    }
  }

  private dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    // In real code, this might release native memory
    // this.buffer = null as any;
  }

  getBuffer(): ArrayBuffer {
    if (this.disposed) {
      throw new Error("Buffer has been disposed");
    }
    return this.buffer;
  }

  getRefCount(): number {
    return this.refCount;
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}
