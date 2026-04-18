// Pattern 61: Singleton-Lazy-Init
// Lazy initialization of a single shared instance

// Variant A: Database connection singleton
interface Database {
  query(sql: string): Promise<unknown[]>;
  close(): Promise<void>;
}

let dbConnection: Database | null = null;

function createDatabaseConnection(): Database {
  return {
    query: async (sql: string) => [],
    close: async () => {},
  };
}

function getDatabase(): Database {
  if (!dbConnection) {
    dbConnection = createDatabaseConnection();
  }
  return dbConnection;
}

// Variant B: Cache service singleton
interface CacheService {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  clear(): void;
}

let cacheInstance: CacheService | null = null;

function createCacheService(): CacheService {
  const store = new Map<string, { value: unknown; expires: number }>();
  return {
    get: <T>(key: string) => {
      const entry = store.get(key);
      if (!entry || entry.expires < Date.now()) return undefined;
      return entry.value as T;
    },
    set: <T>(key: string, value: T, ttl = 3600000) => {
      store.set(key, { value, expires: Date.now() + ttl });
    },
    clear: () => store.clear(),
  };
}

function getCache(): CacheService {
  if (!cacheInstance) {
    cacheInstance = createCacheService();
  }
  return cacheInstance;
}

// Variant C: Logger singleton with config
interface Logger {
  debug(msg: string): void;
  info(msg: string): void;
  error(msg: string, err?: Error): void;
}

let loggerInstance: Logger | null = null;

function createLogger(level: "debug" | "info" | "error"): Logger {
  const levels = { debug: 0, info: 1, error: 2 };
  const minLevel = levels[level];
  return {
    debug: (msg) => minLevel <= 0 && console.log(`[DEBUG] ${msg}`),
    info: (msg) => minLevel <= 1 && console.log(`[INFO] ${msg}`),
    error: (msg, err) => console.error(`[ERROR] ${msg}`, err),
  };
}

function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = createLogger("info");
  }
  return loggerInstance;
}
