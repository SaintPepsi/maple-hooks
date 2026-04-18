// Pattern 52: Fetch-Retry-Timeout
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Initialize attempts -> loop with Result check -> fetch with timeout -> retry on failure
// NOTE: Using Result pattern instead of try-catch per project standards

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface Result<T, E> {
  ok: boolean;
  value?: T;
  error?: E;
}

interface User {
  id: string;
  name: string;
}

interface Product {
  sku: string;
  price: number;
}

interface Order {
  orderId: string;
  items: string[];
}

function fetchWithTimeout<T>(
  _url: string,
  _options: { timeout: number }
): Result<T, Error> {
  return { ok: true, value: {} as T };
}

function delay(_ms: number): Promise<void> {
  return Promise.resolve();
}

// ============================================================================
// VARIANT A: Fetch user with retry
// ============================================================================

async function fetchUserWithRetry(
  userId: string,
  maxRetries: number = 3,
  timeout: number = 5000
): Promise<User | null> {
  let attempts = 0;
  while (attempts < maxRetries) {
    const result = fetchWithTimeout<User>(`/api/users/${userId}`, { timeout });
    if (result.ok && result.value) return result.value;
    attempts++;
    await delay(1000 * attempts);
  }
  return null;
}

// ============================================================================
// VARIANT B: Fetch product with retry
// ============================================================================

async function fetchProductWithRetry(
  sku: string,
  maxRetries: number = 3,
  timeout: number = 5000
): Promise<Product | null> {
  let attempts = 0;
  while (attempts < maxRetries) {
    const result = fetchWithTimeout<Product>(`/api/products/${sku}`, { timeout });
    if (result.ok && result.value) return result.value;
    attempts++;
    await delay(1000 * attempts);
  }
  return null;
}

// ============================================================================
// VARIANT C: Fetch order with retry
// ============================================================================

async function fetchOrderWithRetry(
  orderId: string,
  maxRetries: number = 3,
  timeout: number = 5000
): Promise<Order | null> {
  let attempts = 0;
  while (attempts < maxRetries) {
    const result = fetchWithTimeout<Order>(`/api/orders/${orderId}`, { timeout });
    if (result.ok && result.value) return result.value;
    attempts++;
    await delay(1000 * attempts);
  }
  return null;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  fetchUserWithRetry,
  fetchProductWithRetry,
  fetchOrderWithRetry,
  User,
  Product,
  Order,
};
