// Pattern 89: Mixin-Extend
// Mixins adding behavior to objects through composition

// Variant A: Timestamped Mixin
interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
  touch(): void;
}

function withTimestamps<T extends object>(obj: T): T & Timestamped {
  const now = new Date();
  return {
    ...obj,
    createdAt: now,
    updatedAt: now,
    touch() {
      this.updatedAt = new Date();
    },
  };
}

// Variant B: Identifiable Mixin
interface Identifiable {
  id: string;
  getId(): string;
}

function withId<T extends object>(obj: T): T & Identifiable {
  const id = crypto.randomUUID();
  return {
    ...obj,
    id,
    getId() {
      return this.id;
    },
  };
}

// Variant C: Observable Mixin
interface Observable<T> {
  subscribers: Set<(value: T) => void>;
  subscribe(fn: (value: T) => void): () => void;
  notify(value: T): void;
}

function withObservable<T extends object, V>(obj: T): T & Observable<V> {
  const subscribers = new Set<(value: V) => void>();
  return {
    ...obj,
    subscribers,
    subscribe(fn: (value: V) => void) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    notify(value: V) {
      subscribers.forEach((fn) => fn(value));
    },
  };
}

// Variant D: Serializable Mixin
interface Serializable {
  toJSON(): string;
  fromJSON(json: string): void;
}

function withSerializable<T extends object>(obj: T): T & Serializable {
  return {
    ...obj,
    toJSON() {
      return JSON.stringify(this);
    },
    fromJSON(json: string) {
      const parsed = JSON.parse(json);
      Object.assign(this, parsed);
    },
  };
}

// Usage: Combining multiple mixins
interface BaseEntity {
  name: string;
}

function createEntity(name: string) {
  const base: BaseEntity = { name };
  return withSerializable(withObservable(withId(withTimestamps(base))));
}

export {
  withTimestamps,
  withId,
  withObservable,
  withSerializable,
  createEntity,
};
