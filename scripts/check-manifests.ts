/**
 * CI Drift Checker — Verifies committed manifests match generator output.
 *
 * Runs the generator in dry-run mode and compares derivable fields
 * against committed hook.json / group.json files.
 * Exits 0 if identical, exits 1 with diff if divergent.
 *
 * References:
 *   - Generator: scripts/generate-manifests.ts
 *   - Manifest types: cli/types/manifest.ts
 */

import { dirname, join } from "node:path";
import {
  fileExists as adapterFileExists,
  readFile as adapterReadFile,
} from "@hooks/core/adapters/fs";
import { generate } from "@hooks/scripts/generate-manifests";

// ─── Derivable Field Comparison ─────────────────────────────────────────────

/** Fields in hook.json that the generator controls (not human-curated). */
const HOOK_DERIVABLE_KEYS = ["name", "group", "event", "schemaVersion"] as const;

/** All fields in group.json are derivable except description. */
const GROUP_DERIVABLE_KEYS = ["name", "hooks", "sharedFiles"] as const;

interface Drift {
  path: string;
  field: string;
  expected: string;
  actual: string;
}

function compareDerivable(
  path: string,
  generated: Record<string, unknown>,
  committed: Record<string, unknown>,
  keys: readonly string[],
): Drift[] {
  const drifts: Drift[] = [];
  for (const key of keys) {
    const expected = JSON.stringify(generated[key]);
    const actual = JSON.stringify(committed[key]);
    if (expected !== actual) {
      drifts.push({ path, field: key, expected, actual });
    }
  }
  return drifts;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main(): void {
  const scriptDir = dirname(new URL(import.meta.url).pathname);
  const repoRoot = join(scriptDir, "..");
  const hooksDir = join(repoRoot, "hooks");

  // Run generator in dry-run mode
  const result = generate({ hooksDir, repoRoot, dryRun: true });

  if (!result.ok) {
    process.stderr.write(`[check-manifests] Generator failed: ${result.error.message}\n`);
    process.exit(1);
  }

  const allDrifts: Drift[] = [];

  for (const file of result.value.files) {
    // Only check hook.json and group.json (not presets.json)
    if (!file.path.endsWith("hook.json") && !file.path.endsWith("group.json")) {
      continue;
    }

    // Read committed file
    if (!adapterFileExists(file.path)) {
      allDrifts.push({
        path: file.path,
        field: "(entire file)",
        expected: "(generated)",
        actual: "(missing — not committed)",
      });
      continue;
    }

    const committedResult = adapterReadFile(file.path);
    if (!committedResult.ok) {
      allDrifts.push({
        path: file.path,
        field: "(entire file)",
        expected: "(generated)",
        actual: "(unreadable)",
      });
      continue;
    }

    const generated = JSON.parse(file.content) as Record<string, unknown>;
    const committed = JSON.parse(committedResult.value) as Record<string, unknown>;

    const keys = file.path.endsWith("hook.json") ? HOOK_DERIVABLE_KEYS : GROUP_DERIVABLE_KEYS;

    allDrifts.push(...compareDerivable(file.path, generated, committed, keys));
  }

  if (allDrifts.length === 0) {
    process.stderr.write("[check-manifests] All manifests up to date.\n");
    process.exit(0);
  }

  process.stderr.write(`[check-manifests] ${allDrifts.length} drift(s) detected:\n\n`);
  for (const drift of allDrifts) {
    process.stderr.write(`  ${drift.path} → ${drift.field}\n`);
    process.stderr.write(`    expected: ${drift.expected}\n`);
    process.stderr.write(`    actual:   ${drift.actual}\n\n`);
  }
  process.exit(1);
}

main();
