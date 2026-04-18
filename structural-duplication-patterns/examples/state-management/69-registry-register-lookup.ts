// Pattern 69: Registry-Register-Lookup
// Service registry with registration and lookup

// Variant A: Plugin registry
interface Plugin {
  readonly name: string;
  version: string;
  initialize(): Promise<void>;
  destroy(): Promise<void>;
}

interface PluginRegistry {
  register(plugin: Plugin): void;
  unregister(name: string): boolean;
  get(name: string): Plugin | undefined;
  has(name: string): boolean;
  list(): Plugin[];
}

function createPluginRegistry(): PluginRegistry {
  const plugins = new Map<string, Plugin>();

  return {
    register(plugin: Plugin): void {
      if (plugins.has(plugin.name)) {
        throw new Error(`Plugin "${plugin.name}" already registered`);
      }
      plugins.set(plugin.name, plugin);
    },
    unregister(name: string): boolean {
      return plugins.delete(name);
    },
    get(name: string): Plugin | undefined {
      return plugins.get(name);
    },
    has(name: string): boolean {
      return plugins.has(name);
    },
    list(): Plugin[] {
      return Array.from(plugins.values());
    },
  };
}

// Variant B: Service locator pattern
type ServiceFactory<T> = () => T;

class ServiceRegistry {
  private services = new Map<string, unknown>();
  private factories = new Map<string, ServiceFactory<unknown>>();

  register<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }

  registerFactory<T>(name: string, factory: ServiceFactory<T>): void {
    this.factories.set(name, factory);
  }

  get<T>(name: string): T {
    // Check for existing instance
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    // Try factory
    const factory = this.factories.get(name);
    if (factory) {
      const instance = factory() as T;
      this.services.set(name, instance); // Cache instance
      return instance;
    }

    throw new Error(`Service "${name}" not registered`);
  }

  has(name: string): boolean {
    return this.services.has(name) || this.factories.has(name);
  }

  unregister(name: string): void {
    this.services.delete(name);
    this.factories.delete(name);
  }
}

// Variant C: Handler registry with type-safe lookup
type EventHandler<T = unknown> = (event: T) => void | Promise<void>;

interface HandlerEntry<T> {
  handler: EventHandler<T>;
  priority: number;
  once: boolean;
}

class HandlerRegistry<EventTypes extends Record<string, unknown>> {
  private handlers = new Map<keyof EventTypes, HandlerEntry<unknown>[]>();

  register<K extends keyof EventTypes>(
    eventType: K,
    handler: EventHandler<EventTypes[K]>,
    options: { priority?: number; once?: boolean } = {}
  ): () => void {
    const entry: HandlerEntry<EventTypes[K]> = {
      handler,
      priority: options.priority ?? 0,
      once: options.once ?? false,
    };

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    const list = this.handlers.get(eventType)!;
    list.push(entry as HandlerEntry<unknown>);
    list.sort((a, b) => b.priority - a.priority);

    // Return unregister function
    return () => {
      const idx = list.indexOf(entry as HandlerEntry<unknown>);
      if (idx !== -1) list.splice(idx, 1);
    };
  }

  lookup<K extends keyof EventTypes>(eventType: K): EventHandler<EventTypes[K]>[] {
    const entries = this.handlers.get(eventType) ?? [];
    return entries.map((e) => e.handler) as EventHandler<EventTypes[K]>[];
  }

  async dispatch<K extends keyof EventTypes>(eventType: K, event: EventTypes[K]): Promise<void> {
    const entries = this.handlers.get(eventType) ?? [];
    const toRemove: HandlerEntry<unknown>[] = [];

    for (const entry of entries) {
      await entry.handler(event);
      if (entry.once) toRemove.push(entry);
    }

    // Remove one-time handlers
    for (const entry of toRemove) {
      const idx = entries.indexOf(entry);
      if (idx !== -1) entries.splice(idx, 1);
    }
  }
}
