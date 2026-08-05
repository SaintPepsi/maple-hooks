# IoCScan

## Overview

IoCScan is a **SessionStart** hook that scans for indicators of compromise (IoCs) left by npm supply-chain attacks — most recently the Aug 4 2026 "Shai-Hulud" keyv worm, which injects a malicious `preinstall` script into compromised packages, drops payload files (`setup.mjs`, `Math_Symbol.js`, `math_init.js`), persists via `gh-token-monitor` scripts/services, and injects hooks into `.vscode/tasks.json` and `.claude/settings.json`.

All IoC data (bad package versions, payload filenames, the lifecycle-script pattern, persistence paths) lives in `iocs.json` next to this contract, so responding to a new advisory is a data edit, not a code change.

## Event

`SessionStart` — fires at the start of every session, before any install or build command has a chance to run.

## When It Fires

- Every session start, unless disabled via `hookConfig.ioCScan.enabled: false` in settings.json.

It does **not** block or slow down the session:

- Clean scans return silently (`{}`)
- Any read error (missing directory, unreadable file, bad regex) is swallowed and treated as no finding — the scan never fails the session

## What It Does

1. Checks `hookConfig.ioCScan.enabled` (default: enabled).
2. Loads `iocs.json` from the hook's own directory.
3. **Persistence check** — for each known `gh-token-monitor` artifact path, checks for its existence under `$HOME`. Any hit is `CRITICAL`.
4. **Lockfile check** — for each present lockfile (`package-lock.json`, `bun.lock`, `yarn.lock`, `pnpm-lock.yaml`) in the session `cwd`, checks whether any known-bad `package@version` pair both appear in the file content. Hit is `CRITICAL` (phrased as "possible match, verify" since this is a substring check).
5. **Editor-hook check** — reads `.vscode/tasks.json` and `.claude/settings.json` in `cwd`; flags if either references a known payload filename or the string `gh-token-monitor`. Hit is `CRITICAL`.
6. **node_modules scan** — walks `node_modules/*/package.json` and `node_modules/@*/*/package.json` (capped at 3000 manifests), testing each against the lifecycle-script regex and checking for payload files at the same package root. A lifecycle-script or payload-file match alone is `WARNING` (possible false positive); both together at the same package is `CRITICAL`.
7. If any findings exist, returns `additionalContext` listing them, telling the assistant not to run installs and to advise the user to isolate and investigate.

```typescript
if (findings.length === 0) return ok({});
return ok({
  systemMessage: `IoCScan: ${findings.length} npm supply-chain indicator(s) found...`,
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: "SECURITY WARNING: npm supply-chain IoC detected: ...",
  },
});
```

## Examples

### Example 1: Compromised lockfile

> A project's `package-lock.json` pins `keyv@6.0.0`, a known-bad version from the Shai-Hulud advisory. IoCScan flags it as CRITICAL and the assistant warns the user before running `npm install`.

### Example 2: Persistence artifact found

> `~/Library/LaunchAgents/com.user.gh-token-monitor.plist` exists on the machine from a prior compromise. IoCScan flags it as CRITICAL regardless of which project the session is in.

### Example 3: Clean session

> No lockfile matches, no persistence artifacts, no injected editor hooks, and no lifecycle-script matches in `node_modules`. IoCScan returns `{}` silently.

## Dependencies

| Dependency    | Type    | Purpose                                                                 |
| ------------- | ------- | ------------------------------------------------------------------------ |
| `fs`          | adapter | `fileExists`, `readFile`, `readDir` for scanning lockfiles, hooks, and `node_modules` |
| `process`     | adapter | `getEnv` for resolving `PAI_DIR` when locating settings.json            |
| `hook-config` | lib     | `readHookConfig` for the `hookConfig.ioCScan.enabled` gate               |
| `paths`       | lib     | `getHomeDir`, `defaultStderr`                                            |
| `iocs.json`   | data    | Bad versions, payload filenames, lifecycle pattern, persistence paths   |
