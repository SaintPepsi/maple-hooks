// Pattern 64: Observer-Notify
// Subscribe to state changes and notify all observers

// Variant A: Event emitter for user actions
type UserEventType = "login" | "logout" | "profileUpdate";
type UserEventHandler = (data: unknown) => void;

class UserEventEmitter {
  private listeners = new Map<UserEventType, Set<UserEventHandler>>();

  subscribe(event: UserEventType, handler: UserEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  emit(event: UserEventType, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of Array.from(handlers)) {
      handler(data);
    }
  }
}

// Variant B: Observable store with state changes
interface StoreState {
  items: string[];
  loading: boolean;
  error: string | null;
}

type StoreListener = (state: StoreState) => void;

class ObservableStore {
  private state: StoreState = { items: [], loading: false, error: null };
  private listeners: Set<StoreListener> = new Set();

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    listener(this.state); // Immediate notification
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of Array.from(this.listeners)) {
      listener(this.state);
    }
  }

  setLoading(loading: boolean): void {
    this.state = { ...this.state, loading };
    this.notify();
  }

  setItems(items: string[]): void {
    this.state = { ...this.state, items, loading: false };
    this.notify();
  }

  setError(error: string): void {
    this.state = { ...this.state, error, loading: false };
    this.notify();
  }
}

// Variant C: Property change observer
interface PropertyChangeEvent<T> {
  property: keyof T;
  oldValue: unknown;
  newValue: unknown;
}

type PropertyChangeHandler<T> = (event: PropertyChangeEvent<T>) => void;

class ObservableObject<T extends Record<string, unknown>> {
  private data: T;
  private observers: Set<PropertyChangeHandler<T>> = new Set();

  constructor(initial: T) {
    this.data = { ...initial };
  }

  observe(handler: PropertyChangeHandler<T>): () => void {
    this.observers.add(handler);
    return () => this.observers.delete(handler);
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.data[key];
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    const oldValue = this.data[key];
    if (oldValue === value) return;

    this.data[key] = value;

    const event: PropertyChangeEvent<T> = {
      property: key,
      oldValue,
      newValue: value,
    };

    for (const observer of Array.from(this.observers)) {
      observer(event);
    }
  }
}
