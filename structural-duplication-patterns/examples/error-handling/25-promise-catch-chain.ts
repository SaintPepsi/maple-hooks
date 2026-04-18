// Pattern 25: Promise-Catch-Chain
// Structure: promise.then(handler).catch(errorHandler)
// The pattern chains promise operations with terminal error handling

interface Logger {
  info(message: string): void;
  error(message: string, context?: Record<string, unknown>): void;
}

// Variant A: HTTP request chain
function fetchAndParseUser(
  fetchFn: (url: string) => Promise<Response>,
  logger: Logger,
  userId: string
): Promise<{ id: string; name: string } | null> {
  return fetchFn(`/api/users/${userId}`)
    .then(response => response.json() as Promise<{ id: string; name: string }>)
    .then(user => {
      logger.info(`Fetched user: ${user.name}`);
      return user;
    })
    .catch(error => {
      logger.error('Failed to fetch user', { userId, error });
      return null;
    });
}

function postDataAndLog(
  fetchFn: (url: string, init: RequestInit) => Promise<Response>,
  logger: Logger,
  url: string,
  data: unknown
): Promise<{ success: boolean; id?: string }> {
  return fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(response => response.json() as Promise<{ id: string }>)
    .then(result => {
      logger.info(`Posted successfully: ${result.id}`);
      return { success: true, id: result.id };
    })
    .catch(error => {
      logger.error('POST request failed', { url, error });
      return { success: false };
    });
}

// Variant B: Database operation chain
interface DatabaseConnection {
  query(sql: string): Promise<unknown[]>;
  close(): Promise<void>;
}

function queryAndTransform<T, U>(
  connect: () => Promise<DatabaseConnection>,
  logger: Logger,
  sql: string,
  transformer: (rows: unknown[]) => U[]
): Promise<U[]> {
  return connect()
    .then(conn => conn.query(sql).finally(() => conn.close()))
    .then(rows => {
      logger.info(`Query returned ${rows.length} rows`);
      return transformer(rows);
    })
    .catch(error => {
      logger.error('Database query failed', { sql, error });
      return [];
    });
}

function executeAndConfirm(
  connect: () => Promise<DatabaseConnection>,
  logger: Logger,
  sql: string
): Promise<boolean> {
  return connect()
    .then(conn => conn.query(sql).finally(() => conn.close()))
    .then(() => {
      logger.info('Statement executed successfully');
      return true;
    })
    .catch(error => {
      logger.error('Statement execution failed', { sql, error });
      return false;
    });
}

// Variant C: File processing chain
interface FileReader {
  read(path: string): Promise<string>;
}

interface FileWriter {
  write(path: string, content: string): Promise<void>;
}

function readParseAndTransform<T>(
  reader: FileReader,
  logger: Logger,
  path: string,
  parser: (content: string) => T,
  defaultValue: T
): Promise<T> {
  return reader.read(path)
    .then(content => {
      logger.info(`Read ${content.length} bytes from ${path}`);
      return parser(content);
    })
    .catch(error => {
      logger.error('File read failed', { path, error });
      return defaultValue;
    });
}

function transformAndWrite(
  writer: FileWriter,
  logger: Logger,
  path: string,
  data: unknown,
  serializer: (data: unknown) => string
): Promise<boolean> {
  return Promise.resolve(serializer(data))
    .then(content => writer.write(path, content))
    .then(() => {
      logger.info(`Wrote to ${path}`);
      return true;
    })
    .catch(error => {
      logger.error('File write failed', { path, error });
      return false;
    });
}

export {
  fetchAndParseUser,
  postDataAndLog,
  queryAndTransform,
  executeAndConfirm,
  readParseAndTransform,
  transformAndWrite
};
export type { Logger, DatabaseConnection, FileReader, FileWriter };
