// Pattern 10: Ternary-Default
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Return condition ? value : default

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface User {
  displayName?: string;
}

interface Config {
  timeout?: number;
}

interface Theme {
  primaryColor?: string;
}

const DEFAULT_NAME = "Anonymous";
const DEFAULT_TIMEOUT = 5000;
const DEFAULT_COLOR = "#000000";

// ============================================================================
// VARIANT A: Get user display name with default
// ============================================================================

function getDisplayName(user: User | null): string {
  return user ? user.displayName ?? DEFAULT_NAME : DEFAULT_NAME;
}

// ============================================================================
// VARIANT B: Get config timeout with default
// ============================================================================

function getTimeout(config: Config | null): number {
  return config ? config.timeout ?? DEFAULT_TIMEOUT : DEFAULT_TIMEOUT;
}

// ============================================================================
// VARIANT C: Get theme color with default
// ============================================================================

function getPrimaryColor(theme: Theme | null): string {
  return theme ? theme.primaryColor ?? DEFAULT_COLOR : DEFAULT_COLOR;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  getDisplayName,
  getTimeout,
  getPrimaryColor,
  User,
  Config,
  Theme,
};
