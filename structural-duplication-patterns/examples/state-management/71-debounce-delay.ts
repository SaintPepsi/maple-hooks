// Pattern 71: Debounce-Delay
// Delay execution until activity stops

// Variant A: Search input debounce
type SearchCallback = (query: string) => void;

interface DebouncedSearch {
  search(query: string): void;
  cancel(): void;
  flush(): void;
}

function createDebouncedSearch(callback: SearchCallback, delay = 300): DebouncedSearch {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingQuery: string | null = null;

  return {
    search(query: string): void {
      pendingQuery = query;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        if (pendingQuery !== null) {
          callback(pendingQuery);
          pendingQuery = null;
        }
        timeoutId = null;
      }, delay);
    },
    cancel(): void {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      pendingQuery = null;
    },
    flush(): void {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (pendingQuery !== null) {
        callback(pendingQuery);
        pendingQuery = null;
      }
    },
  };
}

// Variant B: Window resize debounce
interface DebouncedResize {
  onResize(width: number, height: number): void;
  destroy(): void;
}

function createDebouncedResize(
  handler: (width: number, height: number) => void,
  delay = 150
): DebouncedResize {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastWidth = 0;
  let lastHeight = 0;

  return {
    onResize(width: number, height: number): void {
      lastWidth = width;
      lastHeight = height;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        handler(lastWidth, lastHeight);
        timeoutId = null;
      }, delay);
    },
    destroy(): void {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}

// Variant C: Generic debounce with leading/trailing options
interface DebounceOptions {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
}

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  options: DebounceOptions
): T & { cancel: () => void; flush: () => void } {
  const { delay, leading = false, trailing = true } = options;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastCallTime = 0;
  let leadingCalled = false;

  const invoke = () => {
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
  };

  const debounced = ((...args: Parameters<T>) => {
    const now = Date.now();
    lastArgs = args;
    lastCallTime = now;

    // Leading edge call
    if (leading && !leadingCalled && !timeoutId) {
      leadingCalled = true;
      invoke();
    }

    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set trailing edge timeout
    timeoutId = setTimeout(() => {
      timeoutId = null;
      leadingCalled = false;

      if (trailing && lastArgs) {
        invoke();
      }
    }, delay);
  }) as T & { cancel: () => void; flush: () => void };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
    leadingCalled = false;
  };

  debounced.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (lastArgs) {
      invoke();
    }
    leadingCalled = false;
  };

  return debounced;
}
