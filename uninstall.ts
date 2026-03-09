#!/usr/bin/env bun

/**
 * Uninstall pai-hooks from the user's Claude Code settings.
 *
 * Removes all hook entries containing the env var reference and
 * removes the env var itself. Leaves everything else untouched.
 */

import { readFile, writeFile, fileExists } from "@hooks/core/adapters/fs";
import { join, resolve } from "path";

// ─── Types ──────────────────────────────────────────────────────────────────

interface HookEntry {
  type: string;
  command: string;
}

interface MatcherGroup {
  matcher: string;
  hooks: HookEntry[];
}

interface Settings {
  env: Record<string, string>;
  hooks: Record<string, MatcherGroup[]>;
  [key: string]: unknown;
}

// ─── Core Logic ─────────────────────────────────────────────────────────────

export function removeHooksFromSettings(
  settings: { env?: Record<string, string>; hooks?: Record<string, MatcherGroup[]> },
  envVar: string,
): Settings {
  const result: Settings = JSON.parse(JSON.stringify(settings));
  const envVarRef = `\${${envVar}}`;

  // Remove env var
  if (result.env) {
    delete result.env[envVar];
  }

  // Remove hook entries containing the env var
  if (result.hooks) {
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
  }

  return result;
}

// ─── Deps ───────────────────────────────────────────────────────────────────

export interface UninstallDeps {
  readFile: (path: string) => { ok: boolean; value?: string; error?: { message: string } };
  writeFile: (path: string, content: string) => { ok: boolean };
  fileExists: (path: string) => boolean;
  stderr: (msg: string) => void;
  stdout: (msg: string) => void;
  homeDir: string;
}

const defaultDeps: UninstallDeps = {
  readFile,
  writeFile,
  fileExists,
  stderr: (msg) => process.stderr.write(msg + "\n"),
  stdout: (msg) => process.stdout.write(msg + "\n"),
  homeDir: process.env.HOME || process.env.USERPROFILE || "",
};

// ─── CLI Entry Point ────────────────────────────────────────────────────────

export function run(deps: UninstallDeps = defaultDeps): void {
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
  const envVar = manifest.envVar;

  // Find settings.json
  const settingsPath = join(deps.homeDir, ".claude", "settings.json");
  if (!deps.fileExists(settingsPath)) {
    deps.stderr(`Error: ${settingsPath} not found.`);
    return;
  }
  const settingsResult = deps.readFile(settingsPath);
  if (!settingsResult.ok) return;
  const settings = JSON.parse(settingsResult.value!);

  // Check if installed
  if (!settings.env?.[envVar]) {
    deps.stdout("pai-hooks is not installed (env var not found). Nothing to do.");
    return;
  }

  // Remove and write
  const cleaned = removeHooksFromSettings(settings, envVar);
  deps.writeFile(settingsPath, JSON.stringify(cleaned, null, 2) + "\n");

  deps.stdout(`Uninstalled pai-hooks. Removed ${envVar} and all associated hook entries.`);
}

if (import.meta.main) {
  run();
}
