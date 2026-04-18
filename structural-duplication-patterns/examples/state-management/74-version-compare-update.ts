// Pattern 74: Version-Compare-Update
// Optimistic concurrency with version checking

// Variant A: Document versioning
interface VersionedDocument {
  id: string;
  version: number;
  content: string;
  lastModified: number;
}

interface DocumentStore {
  get(id: string): VersionedDocument | undefined;
  update(id: string, content: string, expectedVersion: number): VersionedDocument | null;
  create(id: string, content: string): VersionedDocument;
}

function createDocumentStore(): DocumentStore {
  const documents = new Map<string, VersionedDocument>();

  return {
    get(id: string): VersionedDocument | undefined {
      return documents.get(id);
    },
    update(id: string, content: string, expectedVersion: number): VersionedDocument | null {
      const current = documents.get(id);
      if (!current) return null;

      // Version check - reject if stale
      if (current.version !== expectedVersion) {
        return null; // Conflict - version mismatch
      }

      const updated: VersionedDocument = {
        id,
        version: current.version + 1,
        content,
        lastModified: Date.now(),
      };

      documents.set(id, updated);
      return updated;
    },
    create(id: string, content: string): VersionedDocument {
      const doc: VersionedDocument = {
        id,
        version: 1,
        content,
        lastModified: Date.now(),
      };
      documents.set(id, doc);
      return doc;
    },
  };
}

// Variant B: Entity with ETag-style versioning
interface VersionedEntity<T> {
  data: T;
  etag: string;
  updatedAt: Date;
}

class ETagStore<T> {
  private entities = new Map<string, VersionedEntity<T>>();

  private generateETag(data: T): string {
    return `"${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}"`;
  }

  get(key: string): VersionedEntity<T> | undefined {
    return this.entities.get(key);
  }

  set(key: string, data: T): VersionedEntity<T> {
    const entity: VersionedEntity<T> = {
      data,
      etag: this.generateETag(data),
      updatedAt: new Date(),
    };
    this.entities.set(key, entity);
    return entity;
  }

  updateIfMatch(key: string, data: T, ifMatch: string): VersionedEntity<T> | null {
    const current = this.entities.get(key);
    if (!current) return null;

    if (current.etag !== ifMatch) {
      return null; // Precondition failed
    }

    return this.set(key, data);
  }

  delete(key: string, ifMatch?: string): boolean {
    if (ifMatch) {
      const current = this.entities.get(key);
      if (!current || current.etag !== ifMatch) {
        return false;
      }
    }
    return this.entities.delete(key);
  }
}

// Variant C: Compare-and-swap atomic operation
interface CASValue<T> {
  value: T;
  cas: bigint; // Compare-and-swap token
}

class CASStore<T> {
  private store = new Map<string, CASValue<T>>();
  private casCounter = BigInt(0);

  get(key: string): CASValue<T> | undefined {
    return this.store.get(key);
  }

  set(key: string, value: T): CASValue<T> {
    const entry: CASValue<T> = {
      value,
      cas: ++this.casCounter,
    };
    this.store.set(key, entry);
    return entry;
  }

  compareAndSwap(key: string, value: T, expectedCas: bigint): CASValue<T> | null {
    const current = this.store.get(key);

    // Key doesn't exist - fail CAS
    if (!current) return null;

    // CAS mismatch - concurrent modification
    if (current.cas !== expectedCas) {
      return null;
    }

    // CAS success - update value
    return this.set(key, value);
  }

  getOrCreate(key: string, defaultValue: T): CASValue<T> {
    const existing = this.store.get(key);
    if (existing) return existing;
    return this.set(key, defaultValue);
  }
}
