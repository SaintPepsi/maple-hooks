/**
 * Shared import-parsing utilities.
 *
 * Pure functions for analysing TypeScript source text — no framework
 * dependencies, no Result types, no side-effects.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ClassifiedDeps {
  core: string[];
  lib: string[];
  adapters: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Categorize a single `@hooks/*` import path.
 * Returns `null` for paths that should be ignored (hooks/*, cli/*, scripts/*).
 */
export function categorizeImport(
  modulePath: string,
): { category: "core" | "lib" | "adapters"; dep: string } | null {
  // Ignore sibling hook imports
  if (modulePath.startsWith("@hooks/hooks/")) return null;
  // Ignore CLI imports
  if (modulePath.startsWith("@hooks/cli/")) return null;
  // Ignore script imports
  if (modulePath.startsWith("@hooks/scripts/")) return null;

  // @hooks/core/adapters/* → adapters category
  const adapterMatch = modulePath.match(/^@hooks\/core\/adapters\/(.+)$/);
  if (adapterMatch) return { category: "adapters", dep: adapterMatch[1] };

  // @hooks/core/* → core category
  const coreMatch = modulePath.match(/^@hooks\/core\/(.+)$/);
  if (coreMatch) return { category: "core", dep: coreMatch[1] };

  // @hooks/lib/* → lib category
  const libMatch = modulePath.match(/^@hooks\/lib\/(.+)$/);
  if (libMatch) return { category: "lib", dep: libMatch[1] };

  return null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Parse runtime imports from contract source. Excludes `import type` statements.
 * Returns classified deps.
 */
export function parseImports(source: string): ClassifiedDeps {
  const core = new Set<string>();
  const lib = new Set<string>();
  const adapters = new Set<string>();

  // Normalize multi-line imports into single lines
  const normalized = source.replace(
    /import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']\s*;/g,
    (_fullMatch, importClause: string, modulePath: string) => {
      const collapsed = importClause.replace(/\s+/g, " ").trim();
      return `import ${collapsed} from "${modulePath}";`;
    },
  );

  const importRegex = /^import\s+(.*?)\s+from\s+["'](@hooks\/[^"']+)["']\s*;/gm;

  let match: RegExpExecArray | null = importRegex.exec(normalized);
  while (match !== null) {
    const importClause = match[1];
    const modulePath = match[2];

    // Skip pure type imports
    if (importClause.startsWith("type ")) {
      match = importRegex.exec(normalized);
      continue;
    }

    const categorized = categorizeImport(modulePath);
    if (categorized) {
      const bucket =
        categorized.category === "core" ? core : categorized.category === "lib" ? lib : adapters;
      bucket.add(categorized.dep);
    }

    match = importRegex.exec(normalized);
  }

  return {
    core: [...core].sort(),
    lib: [...lib].sort(),
    adapters: [...adapters].sort(),
  };
}

/**
 * Find *.shared.ts or shared.ts files in a group directory.
 * Returns filenames (not full paths).
 *
 * Accepts any object with a `readDir` method returning `{ ok: true, value: string[] }`,
 * compatible with both CliDeps and GeneratorDeps.
 */
export function discoverSharedFiles(
  groupDir: string,
  deps: { readDir: (path: string) => { ok: boolean; value?: string[] } },
): string[] {
  const result = deps.readDir(groupDir);
  if (!result.ok || !result.value) return [];

  return result.value.filter((f: string) => f === "shared.ts" || f.endsWith(".shared.ts")).sort();
}

/**
 * Determine which shared files a hook imports from its group.
 * Matches both `@hooks/hooks/Group/shared` and `@hooks/hooks/Group/Name.shared`.
 * Returns the list of matched shared filenames (e.g., `["shared.ts", "Name.shared.ts"]`).
 */
export function hookUsesShared(
  source: string,
  groupName: string,
  availableSharedFiles: string[],
): string[] {
  const used: string[] = [];
  for (const sharedFile of availableSharedFiles) {
    // shared.ts → import stem is "shared"
    // Name.shared.ts → import stem is "Name.shared"
    const stem = sharedFile.replace(/\.ts$/, "");
    if (source.includes(`@hooks/hooks/${groupName}/${stem}`)) {
      used.push(sharedFile);
    }
  }
  return used.sort();
}
