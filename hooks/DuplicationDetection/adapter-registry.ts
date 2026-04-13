/**
 * Adapter registry for DuplicationDetection.
 *
 * Single registration point for all language adapters. Provides:
 *   - getAdapterFor(filePath)      — returns the matching adapter or null
 *   - getRegisteredExtensions()    — returns all registered extensions
 *   - hasAdapterFor(filePath)      — true when a non-excluded adapter exists
 *
 * Exclusion check happens before extension matching so that .d.ts files are
 * never matched by the TypeScript adapter even though .d.ts ends with .ts.
 */

import { typescriptAdapter } from "@hooks/hooks/DuplicationDetection/adapters/typescript";
import type { LanguageAdapter } from "@hooks/hooks/DuplicationDetection/shared";

// ─── Registry ────────────────────────────────────────────────────────────────

const ADAPTERS: LanguageAdapter[] = [typescriptAdapter];

/**
 * Returns the registered adapter for a given file path, or null if:
 *   - the file matches an adapter's excludePatterns, or
 *   - no adapter covers the file's extension.
 */
export function getAdapterFor(filePath: string): LanguageAdapter | null {
  for (const adapter of ADAPTERS) {
    // Exclusion patterns take precedence over extension matching.
    if (adapter.excludePatterns?.some((pat) => filePath.endsWith(pat))) return null;
    if (adapter.extensions.some((ext) => filePath.endsWith(ext))) return adapter;
  }
  return null;
}

/**
 * Returns all file extensions registered across all adapters, excluding
 * patterns that are explicitly excluded (e.g. .d.ts is not included).
 */
export function getRegisteredExtensions(): string[] {
  return ADAPTERS.flatMap((a) => a.extensions);
}

/**
 * Returns true when a non-excluded adapter exists for the given file path.
 */
export function hasAdapterFor(filePath: string): boolean {
  return getAdapterFor(filePath) !== null;
}
