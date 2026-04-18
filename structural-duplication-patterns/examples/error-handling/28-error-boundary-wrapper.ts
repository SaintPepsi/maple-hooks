// Pattern 28: Error-Boundary-Wrapper
// Shape: Wrap function call → catch any error → return safe value

// Variant A
function safeParseJson<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// Variant B
function safeExecuteQuery<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// Variant C
function safeLoadConfig<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// Factory for creating safe wrappers (same pattern, parameterized)
function createSafeExecutor<T>(name: string) {
  return function safeExecute(fn: () => T, fallback: T): T {
    try {
      return fn();
    } catch {
      return fallback;
    }
  };
}

export { safeParseJson, safeExecuteQuery, safeLoadConfig, createSafeExecutor };
