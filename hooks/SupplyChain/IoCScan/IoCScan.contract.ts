/**
 * IoCScan Contract — Detect npm supply-chain attack indicators on session start.
 *
 * Runs on SessionStart. Scans for indicators of compromise (IoCs) from the
 * Aug 4 2026 "Shai-Hulud" keyv worm and similar npm supply-chain attacks:
 * malicious preinstall scripts, dropped payload files, gh-token-monitor
 * persistence artifacts, and editor-hook injection into .vscode/tasks.json
 * or .claude/settings.json. Findings surface as SessionStart additionalContext
 * so the assistant can warn the user before any install runs.
 *
 * IoC data (bad versions, payload filenames, persistence paths) lives in
 * iocs.json alongside this contract so future advisories are a data edit,
 * not a code change.
 */

import { join } from "node:path";
import type { SyncHookJSONOutput } from "@anthropic-ai/claude-agent-sdk";
import { fileExists, readDir as fsReadDir, readFile } from "@hooks/core/adapters/fs";
import { getEnv as getEnvAdapter } from "@hooks/core/adapters/process";
import type { SyncHookContract } from "@hooks/core/contract";
import type { ResultError } from "@hooks/core/error";
import { jsonParseFailed } from "@hooks/core/error";
import { ok, type Result, tryCatch } from "@hooks/core/result";
import type { SessionStartInput } from "@hooks/core/types/hook-inputs";
import { readHookConfig } from "@hooks/lib/hook-config";
import { defaultStderr, getHomeDir } from "@hooks/lib/paths";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Lockfiles checked for pinned bad-version package matches. */
const LOCKFILE_NAMES = ["package-lock.json", "bun.lock", "yarn.lock", "pnpm-lock.yaml"] as const;

/** Files checked for injected editor/agent hooks. */
const EDITOR_HOOK_FILES = [
  join(".vscode", "tasks.json"),
  join(".claude", "settings.json"),
] as const;

/** Upper bound on node_modules package manifests scanned per session (perf guard). */
const MAX_MANIFESTS_SCANNED = 3000;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IoCData {
  updated: string;
  advisory: string;
  badVersions: Record<string, string[]>;
  payloadFilenames: string[];
  lifecycleScriptPattern: string;
  persistencePaths: string[];
}

export interface Finding {
  severity: "CRITICAL" | "WARNING";
  message: string;
}

export interface IoCScanDeps {
  fileExists: (path: string) => boolean;
  readFile: (path: string) => Result<string, ResultError>;
  readDir: (path: string) => Result<string[], ResultError>;
  getEnv: (key: string) => string | undefined;
  stderr: (msg: string) => void;
  homeDir: () => string;
  /** Path to this hook's iocs.json data file — injectable so tests can point at a fixture. */
  iocsPath: string;
}

// ─── IoC Data Loading ───────────────────────────────────────────────────────

function loadIocs(deps: IoCScanDeps): Result<IoCData, ResultError> {
  const raw = deps.readFile(deps.iocsPath);
  if (!raw.ok) return raw;
  return tryCatch(
    () => JSON.parse(raw.value) as IoCData,
    (e) => jsonParseFailed(raw.value.slice(0, 120), e),
  );
}

// ─── Config Gate ────────────────────────────────────────────────────────────

function readFileOrNull(deps: IoCScanDeps): (path: string) => string | null {
  return (path: string) => {
    const r = deps.readFile(path);
    return r.ok ? r.value : null;
  };
}

function settingsPathFor(deps: IoCScanDeps): string {
  const paiDir = deps.getEnv("PAI_DIR") ?? join(deps.homeDir(), ".claude");
  return join(paiDir, "settings.json");
}

/** Default enabled — only disabled by an explicit `{ enabled: false }` in hookConfig.ioCScan. */
function isEnabled(deps: IoCScanDeps): boolean {
  const cfg = readHookConfig<{ enabled?: boolean }>(
    "ioCScan",
    readFileOrNull(deps),
    settingsPathFor(deps),
    deps.stderr,
  );
  if (!cfg) return true;
  return cfg.enabled !== false;
}

// ─── Individual Scans ───────────────────────────────────────────────────────

/** (a) Known persistence artifacts (gh-token-monitor scripts/services) under $HOME. */
function scanPersistencePaths(deps: IoCScanDeps, iocs: IoCData): Finding[] {
  const home = deps.homeDir();
  const findings: Finding[] = [];
  for (const relPath of iocs.persistencePaths) {
    const fullPath = join(home, relPath);
    if (deps.fileExists(fullPath)) {
      findings.push({
        severity: "CRITICAL",
        message: `Persistence artifact found: ${fullPath}`,
      });
    }
  }
  return findings;
}

/** (b) Project lockfiles pinned to a known-bad package@version. */
function scanLockfiles(cwd: string, deps: IoCScanDeps, iocs: IoCData): Finding[] {
  const findings: Finding[] = [];
  for (const lockfileName of LOCKFILE_NAMES) {
    const lockfilePath = join(cwd, lockfileName);
    if (!deps.fileExists(lockfilePath)) continue;

    const contentResult = deps.readFile(lockfilePath);
    if (!contentResult.ok) continue;
    const content = contentResult.value;

    for (const [pkgName, versions] of Object.entries(iocs.badVersions)) {
      if (!content.includes(pkgName)) continue;
      for (const version of versions) {
        if (content.includes(version)) {
          findings.push({
            severity: "CRITICAL",
            message: `Possible match, verify: ${pkgName}@${version} referenced in ${lockfilePath}`,
          });
        }
      }
    }
  }
  return findings;
}

/** (c) Editor/agent hook injection into .vscode/tasks.json or .claude/settings.json. */
function scanEditorHooks(cwd: string, deps: IoCScanDeps, iocs: IoCData): Finding[] {
  const findings: Finding[] = [];
  for (const relPath of EDITOR_HOOK_FILES) {
    const fullPath = join(cwd, relPath);
    if (!deps.fileExists(fullPath)) continue;

    const contentResult = deps.readFile(fullPath);
    if (!contentResult.ok) continue;
    const content = contentResult.value;

    const matchedPayload = iocs.payloadFilenames.find((name) => content.includes(name));
    if (matchedPayload) {
      findings.push({
        severity: "CRITICAL",
        message: `Injected hook referencing payload '${matchedPayload}' found in ${fullPath}`,
      });
    } else if (content.includes("gh-token-monitor")) {
      findings.push({
        severity: "CRITICAL",
        message: `Injected hook referencing 'gh-token-monitor' found in ${fullPath}`,
      });
    }
  }
  return findings;
}

/** Collect candidate package directories under node_modules, capped for performance. */
function collectPackageDirs(nodeModulesDir: string, deps: IoCScanDeps): string[] {
  const entriesResult = deps.readDir(nodeModulesDir);
  if (!entriesResult.ok) return [];

  const pkgDirs: string[] = [];
  for (const entry of entriesResult.value) {
    if (pkgDirs.length >= MAX_MANIFESTS_SCANNED) break;

    if (entry.startsWith("@")) {
      const scopeDir = join(nodeModulesDir, entry);
      const scopedResult = deps.readDir(scopeDir);
      if (!scopedResult.ok) continue;
      for (const scopedEntry of scopedResult.value) {
        if (pkgDirs.length >= MAX_MANIFESTS_SCANNED) break;
        pkgDirs.push(join(scopeDir, scopedEntry));
      }
    } else {
      pkgDirs.push(join(nodeModulesDir, entry));
    }
  }
  return pkgDirs;
}

/** (d) node_modules lifecycle-script scan — matches are advisory (possible false positive). */
function scanNodeModules(cwd: string, deps: IoCScanDeps, iocs: IoCData): Finding[] {
  const nodeModulesDir = join(cwd, "node_modules");
  if (!deps.fileExists(nodeModulesDir)) return [];

  const pattern = tryCatch(
    () => new RegExp(iocs.lifecycleScriptPattern),
    (e) => jsonParseFailed(iocs.lifecycleScriptPattern, e),
  );
  if (!pattern.ok) return [];

  const pkgDirs = collectPackageDirs(nodeModulesDir, deps);
  const findings: Finding[] = [];

  for (const pkgDir of pkgDirs) {
    const manifestPath = join(pkgDir, "package.json");
    if (!deps.fileExists(manifestPath)) continue;

    const manifestResult = deps.readFile(manifestPath);
    const matchesLifecycle = manifestResult.ok && pattern.value.test(manifestResult.value);
    const payloadHit = iocs.payloadFilenames.find((name) => deps.fileExists(join(pkgDir, name)));

    if (matchesLifecycle && payloadHit) {
      findings.push({
        severity: "CRITICAL",
        message: `Lifecycle script match AND payload file '${payloadHit}' found in ${pkgDir}`,
      });
    } else if (matchesLifecycle) {
      findings.push({
        severity: "WARNING",
        message: `Suspicious lifecycle script pattern in ${manifestPath} (possible false positive, verify)`,
      });
    } else if (payloadHit) {
      findings.push({
        severity: "WARNING",
        message: `Known payload filename '${payloadHit}' present at ${pkgDir} (possible false positive, verify)`,
      });
    }
  }
  return findings;
}

// ─── Output Assembly ────────────────────────────────────────────────────────

function buildOutput(findings: Finding[], iocs: IoCData): SyncHookJSONOutput {
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const findingList = findings.map((f) => `[${f.severity}] ${f.message}`).join("; ");

  return {
    systemMessage: `IoCScan: ${findings.length} npm supply-chain indicator(s) found (${criticalCount} critical). Advisory: ${iocs.advisory}`,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: `SECURITY WARNING: npm supply-chain IoC detected: ${findingList}. Do not run installs. Advise the user to isolate and investigate.`,
    },
  };
}

// ─── Pure Logic ─────────────────────────────────────────────────────────────

function scanForIoCs(
  input: SessionStartInput,
  deps: IoCScanDeps,
): Result<SyncHookJSONOutput, ResultError> {
  if (!isEnabled(deps)) return ok({});

  const iocsResult = loadIocs(deps);
  if (!iocsResult.ok) {
    deps.stderr(`IoCScan: failed to load iocs.json: ${iocsResult.error.message}`);
    return ok({});
  }
  const iocs = iocsResult.value;

  const findings: Finding[] = [...scanPersistencePaths(deps, iocs)];

  const cwd = input.cwd;
  if (cwd) {
    findings.push(...scanLockfiles(cwd, deps, iocs));
    findings.push(...scanEditorHooks(cwd, deps, iocs));
    findings.push(...scanNodeModules(cwd, deps, iocs));
  }

  if (findings.length === 0) return ok({});

  return ok(buildOutput(findings, iocs));
}

// ─── Default Deps ───────────────────────────────────────────────────────────

const defaultDeps: IoCScanDeps = {
  fileExists,
  readFile,
  readDir: (path: string) => {
    const result = fsReadDir(path);
    if (!result.ok) return result;
    return ok(
      result.value.map((e: { name?: string } | string) =>
        typeof e === "string" ? e : (e.name ?? ""),
      ),
    );
  },
  getEnv: (key: string) => {
    const result = getEnvAdapter(key);
    return result.ok ? result.value : undefined;
  },
  stderr: defaultStderr,
  homeDir: () => getHomeDir(),
  iocsPath: join(import.meta.dir, "iocs.json"),
};

// ─── Contract ───────────────────────────────────────────────────────────────

export const IoCScan: SyncHookContract<SessionStartInput, IoCScanDeps> = {
  name: "IoCScan",
  event: "SessionStart",

  accepts(_input: SessionStartInput): boolean {
    return true;
  },

  execute(
    input: SessionStartInput,
    deps: IoCScanDeps,
  ): Result<SyncHookJSONOutput, ResultError> {
    return scanForIoCs(input, deps);
  },

  defaultDeps,
};
