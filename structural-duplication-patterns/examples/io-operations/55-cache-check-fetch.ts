// Pattern 55: Cache-Check-Fetch
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Check cache for key -> return if hit -> fetch from source -> store in cache -> return

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface UserProfile {
  id: string;
  name: string;
  avatar: string;
}

interface ProductDetails {
  sku: string;
  name: string;
  price: number;
}

interface SessionData {
  sessionId: string;
  userId: string;
  expiresAt: number;
}

interface Cache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
}

const userCache: Cache<UserProfile> = {
  get: () => undefined,
  set: () => {},
};

const productCache: Cache<ProductDetails> = {
  get: () => undefined,
  set: () => {},
};

const sessionCache: Cache<SessionData> = {
  get: () => undefined,
  set: () => {},
};

async function fetchUserFromDb(_id: string): Promise<UserProfile> {
  return { id: "", name: "", avatar: "" };
}

async function fetchProductFromApi(_sku: string): Promise<ProductDetails> {
  return { sku: "", name: "", price: 0 };
}

async function fetchSessionFromStore(_id: string): Promise<SessionData> {
  return { sessionId: "", userId: "", expiresAt: 0 };
}

// ============================================================================
// VARIANT A: Get user with cache
// ============================================================================

async function getUser(userId: string): Promise<UserProfile> {
  const cached = userCache.get(userId);
  if (cached) return cached;
  const user = await fetchUserFromDb(userId);
  userCache.set(userId, user);
  return user;
}

// ============================================================================
// VARIANT B: Get product with cache
// ============================================================================

async function getProduct(sku: string): Promise<ProductDetails> {
  const cached = productCache.get(sku);
  if (cached) return cached;
  const product = await fetchProductFromApi(sku);
  productCache.set(sku, product);
  return product;
}

// ============================================================================
// VARIANT C: Get session with cache
// ============================================================================

async function getSession(sessionId: string): Promise<SessionData> {
  const cached = sessionCache.get(sessionId);
  if (cached) return cached;
  const session = await fetchSessionFromStore(sessionId);
  sessionCache.set(sessionId, session);
  return session;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  getUser,
  getProduct,
  getSession,
  UserProfile,
  ProductDetails,
  SessionData,
};
