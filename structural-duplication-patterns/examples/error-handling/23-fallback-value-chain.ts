// Pattern 23: Fallback-Value-Chain
// Shape: Try primary → fallback to secondary → fallback to default

// Variant A
function resolveUserTheme(
  userPreference: string | null,
  systemDefault: string | null,
): string {
  if (userPreference != null) return userPreference;
  if (systemDefault != null) return systemDefault;
  return "light";
}

// Variant B
function resolveApiEndpoint(
  envOverride: string | null,
  configValue: string | null,
): string {
  if (envOverride != null) return envOverride;
  if (configValue != null) return configValue;
  return "https://api.default.com";
}

// Variant C
function resolveLogLevel(
  runtimeLevel: string | null,
  fileLevel: string | null,
): string {
  if (runtimeLevel != null) return runtimeLevel;
  if (fileLevel != null) return fileLevel;
  return "info";
}

export { resolveUserTheme, resolveApiEndpoint, resolveLogLevel };
