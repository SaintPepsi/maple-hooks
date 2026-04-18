// Pattern 44: Merge-Deep
// Shape: Deep merge multiple objects

// === Types ===

interface UserSettings {
  theme: {
    mode: 'light' | 'dark';
    primaryColor: string;
    fontSize: number;
  };
  notifications: {
    email: boolean;
    push: boolean;
    frequency: 'instant' | 'daily' | 'weekly';
  };
  privacy: {
    profileVisible: boolean;
    showEmail: boolean;
  };
}

interface ServerConfig {
  host: string;
  port: number;
  ssl: {
    enabled: boolean;
    cert: string;
    key: string;
  };
  logging: {
    level: string;
    format: string;
    output: {
      console: boolean;
      file: string | null;
    };
  };
}

interface FormConfig {
  validation: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  display: {
    label: string;
    placeholder: string;
    helpText: string;
  };
}

// === Helper ===

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// === Variant A: Merge user settings ===

function mergeUserSettings(
  target: UserSettings,
  source: Partial<UserSettings>
): UserSettings {
  const result: UserSettings = {
    theme: { ...target.theme },
    notifications: { ...target.notifications },
    privacy: { ...target.privacy },
  };

  if (source.theme) {
    result.theme = { ...result.theme, ...source.theme };
  }
  if (source.notifications) {
    result.notifications = { ...result.notifications, ...source.notifications };
  }
  if (source.privacy) {
    result.privacy = { ...result.privacy, ...source.privacy };
  }

  return result;
}

// === Variant B: Merge server config ===

function mergeServerConfig(
  target: ServerConfig,
  source: Partial<ServerConfig>
): ServerConfig {
  const result: ServerConfig = {
    host: source.host ?? target.host,
    port: source.port ?? target.port,
    ssl: { ...target.ssl },
    logging: {
      ...target.logging,
      output: { ...target.logging.output },
    },
  };

  if (source.ssl) {
    result.ssl = { ...result.ssl, ...source.ssl };
  }
  if (source.logging) {
    result.logging = { ...result.logging, ...source.logging };
    if (source.logging.output) {
      result.logging.output = { ...result.logging.output, ...source.logging.output };
    }
  }

  return result;
}

// === Variant C: Generic deep merge ===

function mergeDeep(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const targetValue = result[key];
    const sourceValue = source[key];

    if (isObject(targetValue) && isObject(sourceValue)) {
      result[key] = mergeDeep(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }

  return result;
}

// === Merge multiple sources ===

function mergeAll(
  target: Record<string, unknown>,
  ...sources: Array<Record<string, unknown>>
): Record<string, unknown> {
  let result = { ...target };
  for (const source of sources) {
    result = mergeDeep(result, source);
  }
  return result;
}

// === Merge with array handling ===

function mergeDeepWithArrays(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  arrayStrategy: 'replace' | 'concat' = 'replace'
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const targetValue = result[key];
    const sourceValue = source[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      result[key] =
        arrayStrategy === 'concat'
          ? [...targetValue, ...sourceValue]
          : sourceValue;
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      result[key] = mergeDeepWithArrays(targetValue, sourceValue, arrayStrategy);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }

  return result;
}

// === Exports ===

export {
  mergeUserSettings,
  mergeServerConfig,
  mergeDeep,
  mergeAll,
  mergeDeepWithArrays,
  isObject,
};

export type { UserSettings, ServerConfig, FormConfig };
