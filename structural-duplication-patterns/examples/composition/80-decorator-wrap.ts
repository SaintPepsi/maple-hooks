// Pattern 80: Decorator-Wrap
// Decorators that wrap objects to add behavior without modifying the original

// Variant A: Logging Decorator
interface DataService {
  fetch(id: string): Promise<unknown>;
  save(id: string, data: unknown): Promise<void>;
}

function withLogging(service: DataService): DataService {
  return {
    async fetch(id: string) {
      console.log(`Fetching: ${id}`);
      const result = await service.fetch(id);
      console.log(`Fetched: ${id}`);
      return result;
    },
    async save(id: string, data: unknown) {
      console.log(`Saving: ${id}`);
      await service.save(id, data);
      console.log(`Saved: ${id}`);
    },
  };
}

// Variant B: Caching Decorator
interface Repository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

function withCaching(repo: Repository, cache: Map<string, string>): Repository {
  return {
    async get(key: string) {
      if (cache.has(key)) {
        return cache.get(key)!;
      }
      const value = await repo.get(key);
      if (value !== null) {
        cache.set(key, value);
      }
      return value;
    },
    async set(key: string, value: string) {
      cache.set(key, value);
      await repo.set(key, value);
    },
  };
}

// Variant C: Retry Decorator (using Result pattern)
interface ApiClient {
  request(endpoint: string): Promise<Response>;
}

type RetryResult =
  | { ok: true; value: Response }
  | { ok: false; error: Error };

function withRetry(client: ApiClient, maxRetries: number) {
  return {
    async requestWithRetry(endpoint: string): Promise<RetryResult> {
      let lastError: Error = new Error("Max retries exceeded");
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const response = await client.request(endpoint).then(
          (res): RetryResult => ({ ok: true, value: res }),
          (err): RetryResult => ({ ok: false, error: err as Error })
        );
        if (response.ok === true) {
          return response;
        }
        lastError = response.error;
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 100));
      }
      return { ok: false, error: lastError };
    },
  };
}

export { withLogging, withCaching, withRetry };
