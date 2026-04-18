// Pattern 72: Throttle-Rate-Limit
// Limit execution rate to max once per interval

// Variant A: API call throttle
interface ThrottledApiClient {
  call<T>(endpoint: string): Promise<T | null>;
  getRemainingCalls(): number;
  resetIn(): number;
}

function createThrottledApiClient(maxCalls: number, intervalMs: number): ThrottledApiClient {
  let callCount = 0;
  let windowStart = Date.now();

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    if (now - windowStart >= intervalMs) {
      windowStart = now;
      callCount = 0;
    }
    return callCount < maxCalls;
  };

  return {
    async call<T>(endpoint: string): Promise<T | null> {
      if (!checkRateLimit()) {
        return null; // Rate limited
      }
      callCount++;
      // Simulated API call
      const response = await fetch(endpoint);
      return response.json() as Promise<T>;
    },
    getRemainingCalls(): number {
      checkRateLimit(); // Update window if needed
      return Math.max(0, maxCalls - callCount);
    },
    resetIn(): number {
      return Math.max(0, intervalMs - (Date.now() - windowStart));
    },
  };
}

// Variant B: Event handler throttle
type EventCallback<T> = (event: T) => void;

interface ThrottledEvent<T> {
  trigger(event: T): void;
  cancel(): void;
}

function createThrottledEvent<T>(callback: EventCallback<T>, intervalMs: number): ThrottledEvent<T> {
  let lastCallTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingEvent: T | null = null;

  return {
    trigger(event: T): void {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;

      if (timeSinceLastCall >= intervalMs) {
        // Enough time passed, call immediately
        lastCallTime = now;
        callback(event);
      } else {
        // Store pending and schedule
        pendingEvent = event;
        if (!timeoutId) {
          timeoutId = setTimeout(() => {
            timeoutId = null;
            if (pendingEvent !== null) {
              lastCallTime = Date.now();
              callback(pendingEvent);
              pendingEvent = null;
            }
          }, intervalMs - timeSinceLastCall);
        }
      }
    },
    cancel(): void {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      pendingEvent = null;
    },
  };
}

// Variant C: Token bucket rate limiter
interface TokenBucket {
  tryConsume(tokens?: number): boolean;
  getAvailableTokens(): number;
  waitForToken(): Promise<void>;
}

function createTokenBucket(capacity: number, refillRate: number): TokenBucket {
  let tokens = capacity;
  let lastRefillTime = Date.now();

  const refill = (): void => {
    const now = Date.now();
    const elapsed = now - lastRefillTime;
    const tokensToAdd = (elapsed / 1000) * refillRate;
    tokens = Math.min(capacity, tokens + tokensToAdd);
    lastRefillTime = now;
  };

  return {
    tryConsume(count = 1): boolean {
      refill();
      if (tokens >= count) {
        tokens -= count;
        return true;
      }
      return false;
    },
    getAvailableTokens(): number {
      refill();
      return Math.floor(tokens);
    },
    async waitForToken(): Promise<void> {
      refill();
      if (tokens >= 1) {
        tokens -= 1;
        return;
      }

      const tokensNeeded = 1 - tokens;
      const waitTime = (tokensNeeded / refillRate) * 1000;

      await new Promise((resolve) => setTimeout(resolve, waitTime));
      tokens = 0; // We consumed the token we waited for
    },
  };
}
