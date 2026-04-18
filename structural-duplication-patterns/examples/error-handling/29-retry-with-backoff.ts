// Pattern 29: Retry-With-Backoff
// Shape: Attempt operation → on failure, wait → retry

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Variant A
async function fetchWithRetry(
  url: string,
  maxAttempts: number = 3,
): Promise<unknown> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fetch(url).then((r) => r.json());
    } catch (e) {
      if (i === maxAttempts - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
  throw new Error("Unreachable");
}

// Variant B
async function queryWithRetry(
  sql: string,
  maxAttempts: number = 3,
): Promise<unknown[]> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await executeQuery(sql);
    } catch (e) {
      if (i === maxAttempts - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
  throw new Error("Unreachable");
}

// Variant C
async function sendWithRetry(
  message: string,
  maxAttempts: number = 3,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await sendMessage(message);
    } catch (e) {
      if (i === maxAttempts - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
  throw new Error("Unreachable");
}

// Placeholder functions
declare function executeQuery(sql: string): Promise<unknown[]>;
declare function sendMessage(message: string): Promise<void>;

export { fetchWithRetry, queryWithRetry, sendWithRetry };
