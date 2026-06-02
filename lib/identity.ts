/**
 * Central Identity Loader
 * Single source of truth for DA (Digital Assistant) and Principal identity
 *
 * Reads from settings.json - the programmatic way, not markdown parsing.
 * All hooks and tools should import from here.
 */

import { join } from "node:path";
import { fileExists as adapterFileExists, readJson } from "@hooks/core/adapters/fs";
import type { ResultError } from "@hooks/core/error";
import type { Result } from "@hooks/core/result";

// ─── DA Identity Config (what lives under daidentity in settings.json) ──────

export interface DAIdentityConfig {
  name?: string;
  fullName?: string;
  displayName?: string;
  color?: string;
}

// ─── Public Types ───────────────────────────────────────────────────────────

export interface Identity {
  name: string;
  fullName: string;
  displayName: string;
  color: string;
}

export interface Principal {
  name: string;
  pronunciation: string;
  timezone: string;
}

export interface Settings {
  daidentity?: DAIdentityConfig;
  principal?: Partial<Principal>;
  env?: Record<string, string>;
}

// ─── Deps Interface ─────────────────────────────────────────────────────────

export interface IdentityDeps {
  settingsPath: string;
  readJson: (path: string) => Result<Settings, ResultError>;
  fileExists: (path: string) => boolean;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_IDENTITY: Identity = {
  name: "PAI",
  fullName: "Personal AI",
  displayName: "PAI",
  color: "#3B82F6",
};

const DEFAULT_PRINCIPAL: Principal = {
  name: "User",
  pronunciation: "",
  timezone: "UTC",
};

const defaultDeps: IdentityDeps = {
  settingsPath: join(process.env.HOME ?? "", ".claude/settings.json"),
  readJson: (path: string) => readJson<Settings>(path),
  fileExists: adapterFileExists,
};

// ─── Cache ──────────────────────────────────────────────────────────────────

let cachedSettings: Settings | null = null;

/**
 * Load settings.json (cached). Uses Result from fs adapter — no try-catch.
 */
function loadSettings(deps: IdentityDeps): Settings {
  if (cachedSettings) return cachedSettings;

  if (!deps.fileExists(deps.settingsPath)) {
    cachedSettings = {};
    return cachedSettings;
  }

  const result = deps.readJson(deps.settingsPath);
  if (!result.ok) {
    cachedSettings = {};
    return cachedSettings;
  }

  cachedSettings = result.value;
  return cachedSettings;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get DA (Digital Assistant) identity from settings.json
 */
export function getIdentity(deps: IdentityDeps = defaultDeps): Identity {
  const settings = loadSettings(deps);
  const daidentity: DAIdentityConfig = settings.daidentity ?? {};

  return {
    name: daidentity.name ?? DEFAULT_IDENTITY.name,
    fullName: daidentity.fullName ?? daidentity.name ?? DEFAULT_IDENTITY.fullName,
    displayName: daidentity.displayName ?? daidentity.name ?? DEFAULT_IDENTITY.displayName,
    color: daidentity.color ?? DEFAULT_IDENTITY.color,
  };
}

/**
 * Get Principal (human owner) identity from settings.json
 */
export function getPrincipal(deps: IdentityDeps = defaultDeps): Principal {
  const settings = loadSettings(deps);
  const principal = settings.principal ?? {};

  return {
    name: principal.name ?? DEFAULT_PRINCIPAL.name,
    pronunciation: principal.pronunciation ?? DEFAULT_PRINCIPAL.pronunciation,
    timezone: principal.timezone ?? DEFAULT_PRINCIPAL.timezone,
  };
}

/**
 * Clear cache (useful for testing or when settings.json changes)
 */
export function clearCache(): void {
  cachedSettings = null;
}

/**
 * Get just the DA name (convenience function)
 */
export function getDAName(deps: IdentityDeps = defaultDeps): string {
  return getIdentity(deps).name;
}

/**
 * Get just the Principal name (convenience function)
 */
export function getPrincipalName(deps: IdentityDeps = defaultDeps): string {
  return getPrincipal(deps).name;
}

/**
 * Get the full settings object (for advanced use)
 */
export function getSettings(deps: IdentityDeps = defaultDeps): Settings {
  return loadSettings(deps);
}

/**
 * Get the default identity (for documentation/testing)
 */
export function getDefaultIdentity(): Identity {
  return { ...DEFAULT_IDENTITY };
}

/**
 * Get the default principal (for documentation/testing)
 */
export function getDefaultPrincipal(): Principal {
  return { ...DEFAULT_PRINCIPAL };
}
