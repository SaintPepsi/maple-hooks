// Pattern 47: Check-Exists-Read
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Check if resource exists -> return default if not -> read and return

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface Theme {
  name: string;
  colors: Record<string, string>;
}

interface UserProfile {
  id: string;
  displayName: string;
  avatar: string;
}

interface CacheEntry {
  key: string;
  value: unknown;
  expires: number;
}

const DEFAULT_THEME: Theme = { name: "light", colors: {} };
const DEFAULT_PROFILE: UserProfile = { id: "guest", displayName: "Guest", avatar: "" };
const DEFAULT_CACHE_ENTRY: CacheEntry = { key: "", value: null, expires: 0 };

function fileExists(_path: string): boolean {
  return true;
}

function readJson<T>(_path: string): T {
  return {} as T;
}

function cacheExists(_key: string): boolean {
  return true;
}

function readCache<T>(_key: string): T {
  return {} as T;
}

// ============================================================================
// VARIANT A: Theme file with fallback
// ============================================================================

function loadTheme(path: string): Theme {
  if (!fileExists(path)) return DEFAULT_THEME;
  const theme = readJson<Theme>(path);
  return theme;
}

// ============================================================================
// VARIANT B: User profile with fallback
// ============================================================================

function loadUserProfile(path: string): UserProfile {
  if (!fileExists(path)) return DEFAULT_PROFILE;
  const profile = readJson<UserProfile>(path);
  return profile;
}

// ============================================================================
// VARIANT C: Cache entry with fallback
// ============================================================================

function loadCacheEntry(key: string): CacheEntry {
  if (!cacheExists(key)) return DEFAULT_CACHE_ENTRY;
  const entry = readCache<CacheEntry>(key);
  return entry;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  loadTheme,
  loadUserProfile,
  loadCacheEntry,
  Theme,
  UserProfile,
  CacheEntry,
};
