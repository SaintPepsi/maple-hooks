// Pattern 46: Read-Parse-Return
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Read file content -> parse as format -> return parsed data

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface UserConfig {
  username: string;
  preferences: Record<string, unknown>;
}

interface AppSettings {
  appName: string;
  version: string;
  features: string[];
}

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
}

function readFile(_path: string): string {
  return "{}";
}

function parseYaml<T>(_content: string): T {
  return {} as T;
}

function parseToml<T>(_content: string): T {
  return {} as T;
}

// ============================================================================
// VARIANT A: JSON config loader
// ============================================================================

function loadUserConfig(path: string): UserConfig {
  const content = readFile(path);
  const parsed = JSON.parse(content) as UserConfig;
  return parsed;
}

// ============================================================================
// VARIANT B: Another JSON config loader with different type
// ============================================================================

function loadAppSettings(path: string): AppSettings {
  const content = readFile(path);
  const parsed = JSON.parse(content) as AppSettings;
  return parsed;
}

// ============================================================================
// VARIANT C: YAML config loader (same structure, different parser)
// ============================================================================

function loadDatabaseConfig(path: string): DatabaseConfig {
  const content = readFile(path);
  const parsed = parseYaml<DatabaseConfig>(content);
  return parsed;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  loadUserConfig,
  loadAppSettings,
  loadDatabaseConfig,
  UserConfig,
  AppSettings,
  DatabaseConfig,
};
