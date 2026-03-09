#!/usr/bin/env bun

/**
 * Install pai-hooks into the user's Claude Code settings.
 *
 * - Reads pai-hooks.json manifest for env var name
 * - Reads settings.hooks.json for hook registrations
 * - Merges into ~/.claude/settings.json (additive, idempotent)
 * - Sets the env var to point to this repo's clone location
 */

import { readFile, writeFile, fileExists } from "@hooks/core/adapters/fs";
import { join, resolve } from "path";

// ─── Types ──────────────────────────────────────────────────────────────────

interface HookEntry {
  type: string;
  command: string;
}

export interface MatcherGroup {
  matcher?: string;
  hooks: HookEntry[];
}

export interface ExportedHooks {
  envVar: string;
  hooks: Record<string, MatcherGroup[]>;
}

export interface Conflict {
  name: string;
  existingCommand: string;
  incomingCommand: string;
}

export type ConflictMode = "keep" | "replace" | "both";

interface Settings {
  env: Record<string, string>;
  hooks: Record<string, MatcherGroup[]>;
  [key: string]: unknown;
}

// ─── Core Logic ─────────────────────────────────────────────────────────────

export function extractHookName(command: string): string {
  const basename = command.split("/").pop() || command;
  return basename.split(".")[0];
}

export function detectConflicts(
  existingHooks: Record<string, MatcherGroup[]>,
  incomingHooks: Record<string, MatcherGroup[]>,
  ownEnvVar: string,
): Conflict[] {
  const envVarRef = `\${${ownEnvVar}}`;

  // Collect all existing hook names (excluding our own)
  const existingByName = new Map<string, string>();
  for (const matchers of Object.values(existingHooks)) {
    for (const group of matchers) {
      for (const hook of (group.hooks || [])) {
        if (hook.command.includes(envVarRef)) continue;
        const name = extractHookName(hook.command);
        if (!existingByName.has(name)) {
          existingByName.set(name, hook.command);
        }
      }
    }
  }

  // Check incoming hooks against existing names
  const seen = new Set<string>();
  const conflicts: Conflict[] = [];
  for (const matchers of Object.values(incomingHooks)) {
    for (const group of matchers) {
      for (const hook of (group.hooks || [])) {
        const name = extractHookName(hook.command);
        if (seen.has(name)) continue;
        const existingCmd = existingByName.get(name);
        if (existingCmd) {
          conflicts.push({ name, existingCommand: existingCmd, incomingCommand: hook.command });
          seen.add(name);
        }
      }
    }
  }

  return conflicts;
}

export function parseConflictFlag(args: string[]): ConflictMode | null {
  if (args.includes("--replace")) return "replace";
  if (args.includes("--keep")) return "keep";
  if (args.includes("--both")) return "both";
  return null;
}

export function filterExportedByResolution(
  exported: ExportedHooks,
  conflicts: Conflict[],
  mode: ConflictMode,
): ExportedHooks {
  if (mode === "both" || conflicts.length === 0) return exported;

  const conflictNames = new Set(conflicts.map((c) => c.name));

  if (mode === "keep") {
    // Remove incoming hooks that conflict
    const filtered: Record<string, MatcherGroup[]> = {};
    for (const [event, matchers] of Object.entries(exported.hooks)) {
      const filteredMatchers: MatcherGroup[] = [];
      for (const group of matchers) {
        const filteredHooks = group.hooks.filter(
          (h) => !conflictNames.has(extractHookName(h.command)),
        );
        if (filteredHooks.length > 0) {
          filteredMatchers.push({ ...group, hooks: filteredHooks });
        }
      }
      if (filteredMatchers.length > 0) {
        filtered[event] = filteredMatchers;
      }
    }
    return { ...exported, hooks: filtered };
  }

  // mode === "replace": return exported as-is (mergeHooksIntoSettings already
  // removes own-env-var entries; we also need to remove conflicting existing ones)
  return exported;
}

export function removeConflictingExisting(
  settings: { hooks?: Record<string, MatcherGroup[]> },
  conflicts: Conflict[],
  ownEnvVar: string,
): { hooks?: Record<string, MatcherGroup[]> } {
  const result: { hooks?: Record<string, MatcherGroup[]> } = JSON.parse(JSON.stringify(settings));
  if (!result.hooks) return result;
  const conflictNames = new Set(conflicts.map((c) => c.name));
  const envVarRef = `\${${ownEnvVar}}`;

  for (const [event, matchers] of Object.entries(result.hooks)) {
    result.hooks[event] = matchers
      .map((group) => ({
        ...group,
        hooks: group.hooks.filter((h) => {
          if (h.command.includes(envVarRef)) return true; // keep our own (merge handles these)
          return !conflictNames.has(extractHookName(h.command));
        }),
      }))
      .filter((group) => group.hooks.length > 0);

    if (result.hooks[event].length === 0) {
      delete result.hooks[event];
    }
  }

  return result;
}

export function formatConflictSummary(conflicts: Conflict[]): string {
  const lines: string[] = [];
  for (const c of conflicts) {
    lines.push(`  Conflict: ${c.name}`);
    lines.push(`    Existing: ${c.existingCommand}`);
    lines.push(`    Incoming: ${c.incomingCommand}`);
    lines.push("");
  }
  lines.push(`${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"} found. Non-conflicting hooks will be installed regardless.`);
  lines.push("");
  lines.push("[k]eep all existing  [r]eplace all  [b]oth");
  return lines.join("\n");
}

export function isAlreadyInstalled(settings: { env?: Record<string, string> }, envVar: string): boolean {
  return settings.env?.[envVar] !== undefined;
}

/**
 * Merge exported hooks into a settings object.
 *
 * - Sets the env var to the clone path
 * - Removes existing entries owned by this env var (identified by ${envVar} in command)
 * - Appends new entries from the export
 *
 * This makes re-install idempotent: old entries are replaced, not duplicated.
 */
export function mergeHooksIntoSettings(
  settings: { env?: Record<string, string>; hooks?: Record<string, MatcherGroup[]> },
  exported: ExportedHooks,
  clonePath: string,
): Settings {
  const result: Settings = JSON.parse(JSON.stringify(settings));
  const envVar = exported.envVar;
  const envVarRef = `\${${envVar}}`;

  // Set env var
  if (!result.env) result.env = {};
  result.env[envVar] = clonePath;

  // Initialize hooks if missing
  if (!result.hooks) result.hooks = {};

  // First pass: remove existing entries owned by this env var
  for (const [event, matchers] of Object.entries(result.hooks)) {
    result.hooks[event] = matchers
      .map((group: MatcherGroup) => ({
        ...group,
        hooks: group.hooks.filter((h: HookEntry) => !h.command.includes(envVarRef)),
      }))
      .filter((group: MatcherGroup) => group.hooks.length > 0);

    if (result.hooks[event].length === 0) {
      delete result.hooks[event];
    }
  }

  // Second pass: append new entries from export
  for (const [event, matchers] of Object.entries(exported.hooks)) {
    if (!result.hooks[event]) result.hooks[event] = [];
    result.hooks[event].push(...matchers);
  }

  return result;
}

// ─── Deps ───────────────────────────────────────────────────────────────────

export interface InstallDeps {
  readFile: (path: string) => { ok: boolean; value?: string; error?: { message: string } };
  writeFile: (path: string, content: string) => { ok: boolean };
  fileExists: (path: string) => boolean;
  stderr: (msg: string) => void;
  stdout: (msg: string) => void;
  homeDir: string;
  argv: string[];
  prompt: (question: string) => Promise<string>;
}

const defaultDeps: InstallDeps = {
  readFile,
  writeFile,
  fileExists,
  stderr: (msg) => process.stderr.write(msg + "\n"),
  stdout: (msg) => process.stdout.write(msg + "\n"),
  homeDir: process.env.HOME || process.env.USERPROFILE || "",
  argv: process.argv.slice(2),
  prompt: async (question: string) => {
    process.stdout.write(question);
    for await (const line of console) {
      return line.trim().toLowerCase();
    }
    return "k";
  },
};

// ─── CLI Entry Point ────────────────────────────────────────────────────────

export async function run(deps: InstallDeps = defaultDeps): Promise<void> {
  const repoRoot = resolve(import.meta.dir);

  // Read manifest
  const manifestPath = join(repoRoot, "pai-hooks.json");
  if (!deps.fileExists(manifestPath)) {
    deps.stderr("Error: pai-hooks.json not found. Are you in the pai-hooks directory?");
    return;
  }
  const manifestResult = deps.readFile(manifestPath);
  if (!manifestResult.ok) return;
  const manifest = JSON.parse(manifestResult.value!);

  // Read exported hooks
  const exportedPath = join(repoRoot, "settings.hooks.json");
  if (!deps.fileExists(exportedPath)) {
    deps.stderr("Error: settings.hooks.json not found. Run 'bun run export-settings' first.");
    return;
  }
  const exportedResult = deps.readFile(exportedPath);
  if (!exportedResult.ok) return;
  let exported: ExportedHooks = JSON.parse(exportedResult.value!);

  // Find settings.json
  const settingsPath = join(deps.homeDir, ".claude", "settings.json");
  if (!deps.fileExists(settingsPath)) {
    deps.stderr(`Error: ${settingsPath} not found. Is Claude Code installed?`);
    return;
  }
  const settingsResult = deps.readFile(settingsPath);
  if (!settingsResult.ok) return;
  const settings = JSON.parse(settingsResult.value!);

  // Check if already installed
  if (isAlreadyInstalled(settings, manifest.envVar)) {
    deps.stdout(`pai-hooks already installed (${manifest.envVar} is set). Re-installing...`);
  }

  // Detect conflicts
  const conflicts = detectConflicts(settings.hooks || {}, exported.hooks, manifest.envVar);

  let resolvedSettings = settings;

  if (conflicts.length > 0) {
    // Try CLI flag first
    let mode = parseConflictFlag(deps.argv);

    if (!mode) {
      // Interactive prompt
      deps.stdout(formatConflictSummary(conflicts));
      const answer = await deps.prompt("\nChoice: ");
      const map: Record<string, ConflictMode> = { k: "keep", r: "replace", b: "both" };
      mode = map[answer] || "keep";
    } else {
      deps.stdout(formatConflictSummary(conflicts));
      deps.stdout(`\nUsing --${mode} mode.`);
    }

    // Apply resolution
    resolvedSettings = mode === "replace"
      ? removeConflictingExisting(settings, conflicts, manifest.envVar)
      : settings;
    exported = filterExportedByResolution(exported, conflicts, mode);

    deps.stdout(`\nResolved ${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"} with: ${mode}`);
  }

  // Merge and write
  const merged = mergeHooksIntoSettings(resolvedSettings, exported, repoRoot);
  deps.writeFile(settingsPath, JSON.stringify(merged, null, 2) + "\n");

  // Count what was added
  const matcherCount = Object.values(exported.hooks).flat().length;
  const hookCount = Object.values(exported.hooks)
    .flat()
    .reduce((sum: number, g: MatcherGroup) => sum + g.hooks.length, 0);

  deps.stdout(`\nInstalled ${hookCount} hooks across ${matcherCount} matcher groups.`);
  deps.stdout(`Environment variable ${manifest.envVar} set to: ${repoRoot}`);
  deps.stdout(`\nTo uninstall: bun run uninstall.ts`);
}

if (import.meta.main) {
  run();
}
