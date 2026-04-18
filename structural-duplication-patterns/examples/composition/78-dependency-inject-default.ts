// Pattern 78: Dependency-Inject-Default
// Functions accepting dependencies with default implementations

// Variant A: User Service with Repository Injection
interface UserRepository {
  findById(id: string): Promise<{ id: string; name: string } | null>;
  save(user: { id: string; name: string }): Promise<void>;
}

const defaultUserRepository: UserRepository = {
  async findById(id) {
    return { id, name: "default" };
  },
  async save() {},
};

function createUserService(repo: UserRepository = defaultUserRepository) {
  return {
    async getUser(id: string) {
      return repo.findById(id);
    },
    async updateUser(id: string, name: string) {
      await repo.save({ id, name });
    },
  };
}

// Variant B: Cache Service with Storage Injection
interface CacheStorage {
  get(key: string): string | null;
  set(key: string, value: string, ttl: number): void;
}

const defaultCacheStorage: CacheStorage = {
  get() {
    return null;
  },
  set() {},
};

function createCacheService(storage: CacheStorage = defaultCacheStorage) {
  return {
    retrieve(key: string) {
      return storage.get(key);
    },
    store(key: string, value: string, ttl = 3600) {
      storage.set(key, value, ttl);
    },
  };
}

// Variant C: Notification Service with Transport Injection
interface NotificationTransport {
  send(recipient: string, message: string): Promise<boolean>;
}

const defaultTransport: NotificationTransport = {
  async send(recipient, message) {
    console.log(`To: ${recipient}, Message: ${message}`);
    return true;
  },
};

function createNotificationService(
  transport: NotificationTransport = defaultTransport
) {
  return {
    async notify(recipient: string, message: string) {
      return transport.send(recipient, message);
    },
    async broadcast(recipients: string[], message: string) {
      return Promise.all(recipients.map((r) => transport.send(r, message)));
    },
  };
}

export { createUserService, createCacheService, createNotificationService };
