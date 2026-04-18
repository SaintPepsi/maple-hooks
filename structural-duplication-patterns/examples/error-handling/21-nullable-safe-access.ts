// Pattern 21: Nullable-Safe-Access
// Structure: value?.property?.nested ?? defaultValue
// The pattern safely navigates nullable chains with fallback defaults

interface Address {
  street?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

interface Company {
  name?: string;
  address?: Address;
}

interface User {
  name: string;
  email?: string;
  company?: Company;
  preferences?: {
    theme?: string;
    language?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
    };
  };
}

// Variant A: Deep property access with default
function getUserCity(user: User | null | undefined): string {
  return user?.company?.address?.city ?? 'Unknown';
}

function getUserTheme(user: User | null | undefined): string {
  return user?.preferences?.theme ?? 'light';
}

function getUserLanguage(user: User | null | undefined): string {
  return user?.preferences?.language ?? 'en';
}

// Variant B: Nested config access
interface AppConfig {
  server?: {
    host?: string;
    port?: number;
    ssl?: {
      enabled?: boolean;
      cert?: string;
    };
  };
  database?: {
    connection?: {
      host?: string;
      port?: number;
    };
  };
}

function getServerHost(config: AppConfig | null): string {
  return config?.server?.host ?? 'localhost';
}

function getServerPort(config: AppConfig | null): number {
  return config?.server?.port ?? 3000;
}

function getDatabaseHost(config: AppConfig | null): string {
  return config?.database?.connection?.host ?? '127.0.0.1';
}

// Variant C: API response navigation
interface ApiResponse {
  data?: {
    user?: {
      profile?: {
        avatar?: string;
        bio?: string;
      };
      stats?: {
        followers?: number;
        posts?: number;
      };
    };
  };
  meta?: {
    pagination?: {
      page?: number;
      total?: number;
    };
  };
}

function getAvatarUrl(response: ApiResponse | null): string {
  return response?.data?.user?.profile?.avatar ?? '/default-avatar.png';
}

function getFollowerCount(response: ApiResponse | null): number {
  return response?.data?.user?.stats?.followers ?? 0;
}

function getCurrentPage(response: ApiResponse | null): number {
  return response?.meta?.pagination?.page ?? 1;
}

export {
  getUserCity,
  getUserTheme,
  getUserLanguage,
  getServerHost,
  getServerPort,
  getDatabaseHost,
  getAvatarUrl,
  getFollowerCount,
  getCurrentPage
};
export type { User, AppConfig, ApiResponse };
