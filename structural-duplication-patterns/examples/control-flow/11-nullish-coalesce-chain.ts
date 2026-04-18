// Pattern 11: Nullish-Coalesce-Chain
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Return first non-null value in chain

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface UserSettings {
  language?: string;
}

interface SystemSettings {
  language?: string;
}

interface BrowserSettings {
  language?: string;
}

interface LocalConfig {
  apiUrl?: string;
}

interface EnvConfig {
  apiUrl?: string;
}

interface DefaultConfig {
  apiUrl?: string;
}

interface UserTheme {
  mode?: string;
}

interface SystemTheme {
  mode?: string;
}

interface FallbackTheme {
  mode?: string;
}

const DEFAULT_LANGUAGE = "en";
const DEFAULT_API_URL = "https://api.example.com";
const DEFAULT_THEME_MODE = "light";

// ============================================================================
// VARIANT A: Resolve language from multiple sources
// ============================================================================

function resolveLanguage(
  userSettings: UserSettings | null,
  systemSettings: SystemSettings | null,
  browserSettings: BrowserSettings | null
): string {
  return (
    userSettings?.language ??
    systemSettings?.language ??
    browserSettings?.language ??
    DEFAULT_LANGUAGE
  );
}

// ============================================================================
// VARIANT B: Resolve API URL from multiple sources
// ============================================================================

function resolveApiUrl(
  localConfig: LocalConfig | null,
  envConfig: EnvConfig | null,
  defaultConfig: DefaultConfig | null
): string {
  return (
    localConfig?.apiUrl ??
    envConfig?.apiUrl ??
    defaultConfig?.apiUrl ??
    DEFAULT_API_URL
  );
}

// ============================================================================
// VARIANT C: Resolve theme mode from multiple sources
// ============================================================================

function resolveThemeMode(
  userTheme: UserTheme | null,
  systemTheme: SystemTheme | null,
  fallbackTheme: FallbackTheme | null
): string {
  return (
    userTheme?.mode ??
    systemTheme?.mode ??
    fallbackTheme?.mode ??
    DEFAULT_THEME_MODE
  );
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  resolveLanguage,
  resolveApiUrl,
  resolveThemeMode,
  UserSettings,
  SystemSettings,
  BrowserSettings,
  LocalConfig,
  EnvConfig,
  DefaultConfig,
  UserTheme,
  SystemTheme,
  FallbackTheme,
};
