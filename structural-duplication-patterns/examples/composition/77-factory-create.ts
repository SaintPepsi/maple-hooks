// Pattern 77: Factory-Create
// Factory functions that create instances with shared initialization logic

// Variant A: Logger Factory
interface Logger {
  level: string;
  prefix: string;
  log(message: string): void;
}

function createLogger(level: string, prefix: string): Logger {
  return {
    level,
    prefix,
    log(message: string) {
      console.log(`[${this.prefix}] ${this.level}: ${message}`);
    },
  };
}

// Variant B: Database Connection Factory
interface DatabaseConnection {
  host: string;
  database: string;
  query(sql: string): Promise<unknown[]>;
}

function createConnection(host: string, database: string): DatabaseConnection {
  return {
    host,
    database,
    async query(sql: string) {
      console.log(`Executing on ${this.host}/${this.database}: ${sql}`);
      return [];
    },
  };
}

// Variant C: HTTP Client Factory
interface HttpClient {
  baseUrl: string;
  headers: Record<string, string>;
  get(path: string): Promise<Response>;
}

function createHttpClient(
  baseUrl: string,
  headers: Record<string, string>
): HttpClient {
  return {
    baseUrl,
    headers,
    async get(path: string) {
      return fetch(`${this.baseUrl}${path}`, { headers: this.headers });
    },
  };
}

export { createLogger, createConnection, createHttpClient };
