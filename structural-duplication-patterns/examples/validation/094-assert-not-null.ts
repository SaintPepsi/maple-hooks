// Pattern 94: Assert-Not-Null
// Runtime assertion that value is not null/undefined with typed result

class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

// Variant A
function assertUser<T>(
  user: T | null | undefined,
  message = 'User is required'
): asserts user is T {
  if (user === null || user === undefined) {
    throw new AssertionError(message);
  }
}

// Variant B
function assertConfig<T>(
  config: T | null | undefined,
  message = 'Configuration is required'
): asserts config is T {
  if (config === null || config === undefined) {
    throw new AssertionError(message);
  }
}

// Variant C
function assertConnection<T>(
  connection: T | null | undefined,
  message = 'Database connection is required'
): asserts connection is T {
  if (connection === null || connection === undefined) {
    throw new AssertionError(message);
  }
}

// Generic versions for common patterns
function assertDefined<T>(
  value: T | null | undefined,
  name: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new AssertionError(`${name} must be defined`);
  }
}

function assertNotEmpty(
  value: string | null | undefined,
  name: string
): asserts value is string {
  if (value === null || value === undefined || value === '') {
    throw new AssertionError(`${name} must not be empty`);
  }
}

// Usage examples
interface User {
  id: string;
  name: string;
}

interface DatabaseConfig {
  host: string;
  port: number;
}

interface Connection {
  isConnected: boolean;
  query: (sql: string) => Promise<unknown>;
}

function processUser(maybeUser: User | null): void {
  assertUser(maybeUser);
  // TypeScript now knows maybeUser is User
  console.log(`Processing user: ${maybeUser.name}`);
}

function initDatabase(maybeConfig: DatabaseConfig | undefined): void {
  assertConfig(maybeConfig, 'Database configuration must be provided');
  // TypeScript now knows maybeConfig is DatabaseConfig
  console.log(`Connecting to ${maybeConfig.host}:${maybeConfig.port}`);
}

async function executeQuery(
  maybeConnection: Connection | null,
  sql: string
): Promise<unknown> {
  assertConnection(maybeConnection);
  // TypeScript now knows maybeConnection is Connection
  return maybeConnection.query(sql);
}

export {
  assertUser,
  assertConfig,
  assertConnection,
  assertDefined,
  assertNotEmpty,
  AssertionError,
};
