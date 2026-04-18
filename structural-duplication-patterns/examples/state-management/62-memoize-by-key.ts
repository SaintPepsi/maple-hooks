// Pattern 62: Memoize-By-Key
// Cache computed values by a lookup key

// Variant A: User profile memoization
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

const userProfileCache = new Map<string, UserProfile>();

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  return { id: userId, name: "User", email: "user@example.com", avatar: "" };
}

async function getUserProfile(userId: string): Promise<UserProfile> {
  if (userProfileCache.has(userId)) {
    return userProfileCache.get(userId)!;
  }
  const profile = await fetchUserProfile(userId);
  userProfileCache.set(userId, profile);
  return profile;
}

// Variant B: Computed price memoization
interface PriceResult {
  basePrice: number;
  discount: number;
  tax: number;
  total: number;
}

const priceCalculationCache = new Map<string, PriceResult>();

function computePrice(productId: string, quantity: number): PriceResult {
  return { basePrice: 100, discount: 10, tax: 8, total: 98 };
}

function getCalculatedPrice(productId: string, quantity: number): PriceResult {
  const cacheKey = `${productId}:${quantity}`;
  if (priceCalculationCache.has(cacheKey)) {
    return priceCalculationCache.get(cacheKey)!;
  }
  const result = computePrice(productId, quantity);
  priceCalculationCache.set(cacheKey, result);
  return result;
}

// Variant C: Generic memoization factory
function createMemoizedFunction<Args extends unknown[], K, V>(
  keyFn: (...args: Args) => K,
  computeFn: (...args: Args) => V
): (...args: Args) => V {
  const cache = new Map<K, V>();

  return (...args: Args): V => {
    const key = keyFn(...args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const value = computeFn(...args);
    cache.set(key, value);
    return value;
  };
}

// Usage example - factorial with explicit types
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

const memoizedFactorial = createMemoizedFunction<[number], number, number>(
  (n) => n,
  (n) => factorial(n)
);
