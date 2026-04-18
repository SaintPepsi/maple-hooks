// Pattern 1: Guard-Clause-Early-Return
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Check condition -> return early -> continue with main logic

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface User {
  id: string;
  name: string;
  email: string;
}

interface Config {
  host: string;
  port: number;
  enabled: boolean;
}

interface Request {
  method: string;
  path: string;
  body: unknown;
}

const DEFAULT_USER: User = { id: "default", name: "Guest", email: "guest@example.com" };
const DEFAULT_CONFIG: Config = { host: "localhost", port: 3000, enabled: false };
const DEFAULT_REQUEST: Request = { method: "GET", path: "/", body: null };

function processUser(user: User): User {
  return { ...user, name: user.name.toUpperCase() };
}

function processConfig(config: Config): Config {
  return { ...config, enabled: true };
}

function processRequest(request: Request): Request {
  return { ...request, method: request.method.toUpperCase() };
}

// ============================================================================
// VARIANT A: User validation with null guard
// ============================================================================

function validateUser(user: User | null): User {
  if (!user) return DEFAULT_USER;
  return processUser(user);
}

// ============================================================================
// VARIANT B: Config validation with null guard
// ============================================================================

function validateConfig(config: Config | null): Config {
  if (!config) return DEFAULT_CONFIG;
  return processConfig(config);
}

// ============================================================================
// VARIANT C: Request validation with null guard
// ============================================================================

function validateRequest(request: Request | null): Request {
  if (!request) return DEFAULT_REQUEST;
  return processRequest(request);
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  validateUser,
  validateConfig,
  validateRequest,
  User,
  Config,
  Request,
};
