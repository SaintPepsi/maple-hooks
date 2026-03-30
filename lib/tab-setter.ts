/**
 * tab-setter.ts - Tab state stubs (no-op after kitty removal in #56).
 *
 * All kitty terminal integration removed. Functions are retained as no-ops
 * to preserve the public API for callers that have not yet been cleaned up.
 */

import { fileNotFound, type PaiError } from "@hooks/core/error";
import { err, type Result } from "@hooks/core/result";
import { paiPath } from "@hooks/lib/paths";
import { fileExists, readJson } from "@hooks/core/adapters/fs";
import { getEnv } from "@hooks/core/adapters/process";
import type { AlgorithmTabPhase, TabState } from "@hooks/lib/tab-constants";

// ── Deps (minimal — only what pure utility functions need) ──

export interface TabSetterDeps {
  fileExists: (path: string) => boolean;
  writeFile: (path: string, content: string) => Result<void, PaiError>;
  ensureDir: (path: string) => Result<void, PaiError>;
  readDir: (path: string) => Result<string[], PaiError>;
  removeFile: (path: string) => Result<void, PaiError>;
  readFile: (path: string) => Result<string, PaiError>;
  readJson: <T>(path: string) => Result<T, PaiError>;
  execSync: (
    cmd: string,
    opts?: { timeout?: number; stdio?: "pipe" | "inherit" | "ignore" },
  ) => Result<string, PaiError>;
  getEnv: (name: string) => string | undefined;
  stderr: (msg: string) => void;
}

function envLookup(name: string): string | undefined {
  const result = getEnv(name);
  return result.ok ? result.value : undefined;
}

export const defaultTabSetterDeps: TabSetterDeps = {
  fileExists,
  writeFile: () => ({ ok: true, value: undefined }),
  ensureDir: () => ({ ok: true, value: undefined }),
  readDir: () => ({ ok: true, value: [] }),
  removeFile: () => ({ ok: true, value: undefined }),
  readFile: (_path: string) => err(fileNotFound(_path)),
  readJson: <T>(_path: string) => err(fileNotFound(_path)) as Result<T, PaiError>,
  execSync: () => ({ ok: true, value: "" }),
  getEnv: envLookup,
  stderr: (msg: string) => process.stderr.write(`${msg}\n`),
};

interface SetTabOptions {
  title: string;
  state: TabState;
  previousTitle?: string;
  sessionId?: string;
}

// ── No-op stubs (kitty removed in #56) ──

export function persistKittySession(
  _sessionId: string,
  _listenOn: string,
  _windowId: string,
  _deps: TabSetterDeps = defaultTabSetterDeps,
): void {}

export function cleanupKittySession(
  _sessionId: string,
  _deps: TabSetterDeps = defaultTabSetterDeps,
): void {}

export function setTabState(
  _opts: SetTabOptions,
  _deps: TabSetterDeps = defaultTabSetterDeps,
): void {}

export function readTabState(
  _sessionId?: string,
  _deps: TabSetterDeps = defaultTabSetterDeps,
): { title: string; state: TabState; previousTitle?: string; phase?: string } | null {
  return null;
}

export function setPhaseTab(
  _phase: AlgorithmTabPhase,
  _sessionId: string,
  _summary?: string,
  _deps: TabSetterDeps = defaultTabSetterDeps,
): void {}

// ── Pure utility functions (no kitty deps) ──

/**
 * Strip emoji prefix from a tab title to get raw text.
 * Handles both working-state prefixes and Algorithm phase symbols.
 */
export function stripPrefix(title: string): string {
  return title
    .replace(
      /^(?:🧠|⚙️|⚙|✓|❓|👁️|📋|🔨|⚡|✅|📚)\s*/u,
      "",
    )
    .trim();
}

// Noise words to skip when extracting the session label
const SESSION_NOISE = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "for",
  "to",
  "in",
  "on",
  "of",
  "with",
  "my",
  "our",
  "new",
  "old",
  "fix",
  "add",
  "update",
  "set",
  "get",
]);

/**
 * Extract two representative words from a session name.
 * "Tab Title Upgrade" -> "TAB TITLE", "Security Redesign" -> "SECURITY REDESIGN"
 * "Fix Activity Dashboard" -> "ACTIVITY DASHBOARD"
 * Returns uppercase. Falls back to first two words if all are noise.
 */
export function getSessionOneWord(
  sessionId: string,
  deps: TabSetterDeps = defaultTabSetterDeps,
): string | null {
  const namesPath = paiPath("MEMORY", "STATE", "session-names.json");
  if (!deps.fileExists(namesPath)) return null;
  const result = deps.readJson<Record<string, string>>(namesPath);
  if (!result.ok) return null;
  const fullName = result.value[sessionId];
  if (!fullName) return null;

  const words = fullName.split(/\s+/).filter((w: string) => w.length > 0);
  if (words.length === 0) return null;

  // Collect up to 2 non-noise words
  const meaningful = words.filter((w: string) => !SESSION_NOISE.has(w.toLowerCase()));
  if (meaningful.length >= 2) {
    return `${meaningful[0]} ${meaningful[1]}`.toUpperCase();
  } else if (meaningful.length === 1) {
    // One meaningful word — grab the next word (even if noise) for context
    const idx = words.indexOf(meaningful[0]);
    const next = words[idx + 1];
    if (next) return `${meaningful[0]} ${next}`.toUpperCase();
    return meaningful[0].toUpperCase();
  }
  // All noise — take first two
  return words.slice(0, 2).join(" ").toUpperCase();
}
