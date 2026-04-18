// Pattern 79: Adapter-Wrap
// Adapters that wrap one interface to conform to another

// Variant A: Legacy API Adapter
interface LegacyUserApi {
  getUserData(userId: number): { user_name: string; user_email: string };
}

interface ModernUserApi {
  getUser(id: string): { name: string; email: string };
}

function createUserApiAdapter(legacy: LegacyUserApi): ModernUserApi {
  return {
    getUser(id: string) {
      const data = legacy.getUserData(parseInt(id, 10));
      return {
        name: data.user_name,
        email: data.user_email,
      };
    },
  };
}

// Variant B: External Storage Adapter
interface ExternalStorage {
  putObject(bucket: string, key: string, data: Buffer): Promise<void>;
  getObject(bucket: string, key: string): Promise<Buffer>;
}

interface FileStorage {
  write(path: string, content: Buffer): Promise<void>;
  read(path: string): Promise<Buffer>;
}

function createStorageAdapter(
  external: ExternalStorage,
  bucket: string
): FileStorage {
  return {
    async write(path: string, content: Buffer) {
      await external.putObject(bucket, path, content);
    },
    async read(path: string) {
      return external.getObject(bucket, path);
    },
  };
}

// Variant C: Event System Adapter
interface PubSubSystem {
  publish(channel: string, payload: string): void;
  subscribe(channel: string, handler: (payload: string) => void): void;
}

interface EventBus {
  emit(event: string, data: unknown): void;
  on(event: string, listener: (data: unknown) => void): void;
}

function createEventBusAdapter(pubsub: PubSubSystem): EventBus {
  return {
    emit(event: string, data: unknown) {
      pubsub.publish(event, JSON.stringify(data));
    },
    on(event: string, listener: (data: unknown) => void) {
      pubsub.subscribe(event, (payload) => {
        listener(JSON.parse(payload));
      });
    },
  };
}

export { createUserApiAdapter, createStorageAdapter, createEventBusAdapter };
