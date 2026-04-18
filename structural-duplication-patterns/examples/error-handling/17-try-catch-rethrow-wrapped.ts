// Pattern 17: Try-Catch-Rethrow-Wrapped
// Shape: Try operation → catch → wrap error → rethrow

class DatabaseError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
  }
}

class ApiError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
  }
}

class FileSystemError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
  }
}

// Variant A
function executeQuery(sql: string): unknown[] {
  try {
    return runSql(sql);
  } catch (e) {
    throw new DatabaseError(`Query failed: ${sql}`, e as Error);
  }
}

// Variant B
function fetchApiData(endpoint: string): unknown {
  try {
    return httpGet(endpoint);
  } catch (e) {
    throw new ApiError(`API request failed: ${endpoint}`, e as Error);
  }
}

// Variant C
function loadFileData(path: string): string {
  try {
    return readFileSync(path);
  } catch (e) {
    throw new FileSystemError(`File read failed: ${path}`, e as Error);
  }
}

// Placeholder functions
declare function runSql(sql: string): unknown[];
declare function httpGet(endpoint: string): unknown;
declare function readFileSync(path: string): string;

export { executeQuery, fetchApiData, loadFileData };
