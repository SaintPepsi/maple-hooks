/**
 * IoCScan Contract Tests.
 *
 * Validates npm supply-chain IoC detection across all four scan categories:
 * persistence artifacts, lockfile bad-version pins, editor-hook injection,
 * and node_modules lifecycle-script matches. Also validates the config gate
 * and graceful handling of read failures.
 */

import { describe, expect, it } from "bun:test";
import { ErrorCode, ResultError } from "@hooks/core/error";
import { err, ok } from "@hooks/core/result";
import type { SessionStartInput } from "@hooks/core/types/hook-inputs";
import { IoCScan, type IoCScanDeps } from "@hooks/hooks/SupplyChain/IoCScan/IoCScan.contract";
import { getInjectedContextFor } from "@hooks/lib/test-helpers";

// ─── Test Fixtures ───────────────────────────────────────────────────────────

const IOCS_PATH = "/fake/hooks/SupplyChain/IoCScan/iocs.json";
const SETTINGS_PATH = "/fake/home/.claude/settings.json";

const IOCS_JSON = JSON.stringify({
  updated: "2026-08-05",
  advisory: "https://snyk.io/blog/inside-keyv-npm-compromise-preinstall-malware-trusted-provenance-ide-hooks/",
  badVersions: {
    keyv: ["6.0.0"],
    "flat-cache": ["6.1.24"],
  },
  payloadFilenames: ["setup.mjs", "Math_Symbol.js", "math_init.js"],
  lifecycleScriptPattern: '"(preinstall|install|postinstall)"\\s*:\\s*"[^"]*setup\\.mjs',
  persistencePaths: [
    ".local/bin/gh-token-monitor.sh",
    ".config/gh-token-monitor",
    ".config/systemd/user/gh-token-monitor.service",
    "Library/LaunchAgents/com.user.gh-token-monitor.plist",
  ],
});

function makeDeps(overrides: Partial<IoCScanDeps> = {}): IoCScanDeps {
  return {
    fileExists: (path: string) => path === IOCS_PATH,
    readFile: (path: string) => {
      if (path === IOCS_PATH) return ok(IOCS_JSON);
      return err(new ResultError(ErrorCode.FileNotFound, `not found: ${path}`));
    },
    readDir: () => ok([]),
    getEnv: () => undefined,
    stderr: () => {},
    homeDir: () => "/fake/home",
    iocsPath: IOCS_PATH,
    ...overrides,
  };
}

function makeInput(overrides: Partial<SessionStartInput> = {}): SessionStartInput {
  return { session_id: "test-session", cwd: "/fake/project", ...overrides };
}

// ─── Contract Metadata ──────────────────────────────────────────────────────

describe("IoCScan contract", () => {
  it("has correct name and event", () => {
    expect(IoCScan.name).toBe("IoCScan");
    expect(IoCScan.event).toBe("SessionStart");
  });

  it("accepts() always returns true", () => {
    expect(IoCScan.accepts(makeInput())).toBe(true);
  });
});

// ─── Clean Scan ─────────────────────────────────────────────────────────────

describe("IoCScan execute — clean system", () => {
  it("returns {} when nothing matches", () => {
    const result = IoCScan.execute(makeInput(), makeDeps());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({});
    }
  });

  it("returns {} when cwd is missing from input (skips project checks)", () => {
    const result = IoCScan.execute(makeInput({ cwd: undefined }), makeDeps());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({});
    }
  });
});

// ─── Persistence Path Detection ─────────────────────────────────────────────

describe("IoCScan execute — persistence artifacts", () => {
  it("flags a gh-token-monitor persistence path as CRITICAL", () => {
    const hitPath = "/fake/home/.local/bin/gh-token-monitor.sh";
    const deps = makeDeps({
      fileExists: (path: string) => path === IOCS_PATH || path === hitPath,
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.hookSpecificOutput).toBeDefined();
      const ctx = getInjectedContextFor(result.value, "SessionStart") ?? "";
      expect(ctx).toContain("CRITICAL");
      expect(ctx).toContain(hitPath);
      expect(ctx).toContain("SECURITY WARNING");
      expect(ctx).toContain("Do not run installs");
    }
  });

  it("detects persistence artifacts even without a cwd", () => {
    const hitPath = "/fake/home/Library/LaunchAgents/com.user.gh-token-monitor.plist";
    const deps = makeDeps({
      fileExists: (path: string) => path === IOCS_PATH || path === hitPath,
    });

    const result = IoCScan.execute(makeInput({ cwd: undefined }), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ctx = getInjectedContextFor(result.value, "SessionStart") ?? "";
      expect(ctx).toContain(hitPath);
    }
  });
});

// ─── Lockfile Bad-Version Detection ─────────────────────────────────────────

describe("IoCScan execute — lockfile scanning", () => {
  it("flags a lockfile pinning keyv@6.0.0 as CRITICAL", () => {
    const lockfilePath = "/fake/project/package-lock.json";
    const deps = makeDeps({
      fileExists: (path: string) => path === IOCS_PATH || path === lockfilePath,
      readFile: (path: string) => {
        if (path === IOCS_PATH) return ok(IOCS_JSON);
        if (path === lockfilePath) {
          return ok(JSON.stringify({ dependencies: { keyv: { version: "6.0.0" } } }));
        }
        return err(new ResultError(ErrorCode.FileNotFound, path));
      },
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ctx = getInjectedContextFor(result.value, "SessionStart") ?? "";
      expect(ctx).toContain("CRITICAL");
      expect(ctx).toContain("keyv");
      expect(ctx).toContain("6.0.0");
      expect(ctx).toContain("Possible match, verify");
    }
  });

  it("does not flag a benign lockfile pinning keyv@4.5.4", () => {
    const lockfilePath = "/fake/project/package-lock.json";
    const deps = makeDeps({
      fileExists: (path: string) => path === IOCS_PATH || path === lockfilePath,
      readFile: (path: string) => {
        if (path === IOCS_PATH) return ok(IOCS_JSON);
        if (path === lockfilePath) {
          return ok(JSON.stringify({ dependencies: { keyv: { version: "4.5.4" } } }));
        }
        return err(new ResultError(ErrorCode.FileNotFound, path));
      },
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({});
    }
  });
});

// ─── Editor Hook Injection ──────────────────────────────────────────────────

describe("IoCScan execute — editor hook injection", () => {
  it("flags .claude/settings.json referencing a payload filename as CRITICAL", () => {
    const settingsFile = "/fake/project/.claude/settings.json";
    const deps = makeDeps({
      fileExists: (path: string) => path === IOCS_PATH || path === settingsFile,
      readFile: (path: string) => {
        if (path === IOCS_PATH) return ok(IOCS_JSON);
        if (path === settingsFile) {
          return ok(JSON.stringify({ hooks: { SessionStart: [{ command: "node setup.mjs" }] } }));
        }
        return err(new ResultError(ErrorCode.FileNotFound, path));
      },
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ctx = getInjectedContextFor(result.value, "SessionStart") ?? "";
      expect(ctx).toContain("CRITICAL");
      expect(ctx).toContain(settingsFile);
    }
  });

  it("flags .vscode/tasks.json referencing gh-token-monitor as CRITICAL", () => {
    const tasksFile = "/fake/project/.vscode/tasks.json";
    const deps = makeDeps({
      fileExists: (path: string) => path === IOCS_PATH || path === tasksFile,
      readFile: (path: string) => {
        if (path === IOCS_PATH) return ok(IOCS_JSON);
        if (path === tasksFile) {
          return ok(JSON.stringify({ tasks: [{ command: "gh-token-monitor" }] }));
        }
        return err(new ResultError(ErrorCode.FileNotFound, path));
      },
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ctx = getInjectedContextFor(result.value, "SessionStart") ?? "";
      expect(ctx).toContain("CRITICAL");
      expect(ctx).toContain(tasksFile);
    }
  });
});

// ─── node_modules Lifecycle Scan ────────────────────────────────────────────

describe("IoCScan execute — node_modules lifecycle scan", () => {
  it("flags a lifecycle-script match alone as WARNING", () => {
    const nodeModulesDir = "/fake/project/node_modules";
    const pkgDir = "/fake/project/node_modules/evil-pkg";
    const manifestPath = "/fake/project/node_modules/evil-pkg/package.json";

    const deps = makeDeps({
      fileExists: (path: string) => path === IOCS_PATH || path === nodeModulesDir || path === manifestPath,
      readDir: (path: string) => {
        if (path === nodeModulesDir) return ok(["evil-pkg"]);
        return ok([]);
      },
      readFile: (path: string) => {
        if (path === IOCS_PATH) return ok(IOCS_JSON);
        if (path === manifestPath) {
          return ok(JSON.stringify({ scripts: { preinstall: "node setup.mjs" } }));
        }
        return err(new ResultError(ErrorCode.FileNotFound, path));
      },
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ctx = getInjectedContextFor(result.value, "SessionStart") ?? "";
      expect(ctx).toContain("WARNING");
      expect(ctx).not.toContain("CRITICAL");
      expect(ctx).toContain(manifestPath);
    }
  });

  it("flags a lifecycle-script match plus a payload file as CRITICAL", () => {
    const nodeModulesDir = "/fake/project/node_modules";
    const pkgDir = "/fake/project/node_modules/evil-pkg";
    const manifestPath = "/fake/project/node_modules/evil-pkg/package.json";
    const payloadPath = "/fake/project/node_modules/evil-pkg/setup.mjs";

    const deps = makeDeps({
      fileExists: (path: string) =>
        path === IOCS_PATH || path === nodeModulesDir || path === manifestPath || path === payloadPath,
      readDir: (path: string) => {
        if (path === nodeModulesDir) return ok(["evil-pkg"]);
        return ok([]);
      },
      readFile: (path: string) => {
        if (path === IOCS_PATH) return ok(IOCS_JSON);
        if (path === manifestPath) {
          return ok(JSON.stringify({ scripts: { preinstall: "node setup.mjs" } }));
        }
        return err(new ResultError(ErrorCode.FileNotFound, path));
      },
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ctx = getInjectedContextFor(result.value, "SessionStart") ?? "";
      expect(ctx).toContain("CRITICAL");
      expect(ctx).toContain(pkgDir);
    }
  });

  it("scans scoped (@scope/pkg) node_modules directories", () => {
    const nodeModulesDir = "/fake/project/node_modules";
    const scopeDir = "/fake/project/node_modules/@cacheable";
    const manifestPath = "/fake/project/node_modules/@cacheable/memory/package.json";

    const deps = makeDeps({
      fileExists: (path: string) => path === IOCS_PATH || path === nodeModulesDir || path === manifestPath,
      readDir: (path: string) => {
        if (path === nodeModulesDir) return ok(["@cacheable"]);
        if (path === scopeDir) return ok(["memory"]);
        return ok([]);
      },
      readFile: (path: string) => {
        if (path === IOCS_PATH) return ok(IOCS_JSON);
        if (path === manifestPath) {
          return ok(JSON.stringify({ scripts: { postinstall: "node setup.mjs" } }));
        }
        return err(new ResultError(ErrorCode.FileNotFound, path));
      },
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ctx = getInjectedContextFor(result.value, "SessionStart") ?? "";
      expect(ctx).toContain("WARNING");
      expect(ctx).toContain(manifestPath);
    }
  });

  it("does not scan when node_modules does not exist", () => {
    const deps = makeDeps({
      fileExists: (path: string) => path === IOCS_PATH,
      readDir: () => err(new ResultError(ErrorCode.FileReadFailed, "no such dir")),
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({});
    }
  });
});

// ─── Config Gate ────────────────────────────────────────────────────────────

describe("IoCScan execute — config gate", () => {
  it("no-ops when hookConfig.ioCScan.enabled is false", () => {
    const hitPath = "/fake/home/.local/bin/gh-token-monitor.sh";
    const deps = makeDeps({
      fileExists: (path: string) => path === IOCS_PATH || path === hitPath || path === SETTINGS_PATH,
      readFile: (path: string) => {
        if (path === IOCS_PATH) return ok(IOCS_JSON);
        if (path === SETTINGS_PATH) {
          return ok(JSON.stringify({ hookConfig: { ioCScan: { enabled: false } } }));
        }
        return err(new ResultError(ErrorCode.FileNotFound, path));
      },
      getEnv: (key: string) => (key === "PAI_DIR" ? "/fake/home/.claude" : undefined),
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({});
    }
  });

  it("scans normally when config is missing (default enabled)", () => {
    const hitPath = "/fake/home/.local/bin/gh-token-monitor.sh";
    const deps = makeDeps({
      fileExists: (path: string) => path === IOCS_PATH || path === hitPath,
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.hookSpecificOutput).toBeDefined();
    }
  });

  it("scans normally when hookConfig.ioCScan.enabled is explicitly true", () => {
    const hitPath = "/fake/home/.local/bin/gh-token-monitor.sh";
    const deps = makeDeps({
      fileExists: (path: string) => path === IOCS_PATH || path === hitPath || path === SETTINGS_PATH,
      readFile: (path: string) => {
        if (path === IOCS_PATH) return ok(IOCS_JSON);
        if (path === SETTINGS_PATH) {
          return ok(JSON.stringify({ hookConfig: { ioCScan: { enabled: true } } }));
        }
        return err(new ResultError(ErrorCode.FileNotFound, path));
      },
      getEnv: (key: string) => (key === "PAI_DIR" ? "/fake/home/.claude" : undefined),
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.hookSpecificOutput).toBeDefined();
    }
  });
});

// ─── Graceful Error Handling ─────────────────────────────────────────────────

describe("IoCScan execute — error handling", () => {
  it("returns {} when iocs.json cannot be read", () => {
    const deps = makeDeps({
      fileExists: () => false,
      readFile: () => err(new ResultError(ErrorCode.FileNotFound, "missing iocs.json")),
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({});
    }
  });

  it("returns {} when iocs.json contains invalid JSON", () => {
    const deps = makeDeps({
      readFile: (path: string) => {
        if (path === IOCS_PATH) return ok("{ not valid json");
        return err(new ResultError(ErrorCode.FileNotFound, path));
      },
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({});
    }
  });

  it("skips a lockfile that exists but fails to read", () => {
    const lockfilePath = "/fake/project/package-lock.json";
    const deps = makeDeps({
      fileExists: (path: string) => path === IOCS_PATH || path === lockfilePath,
      readFile: (path: string) => {
        if (path === IOCS_PATH) return ok(IOCS_JSON);
        if (path === lockfilePath) {
          return err(new ResultError(ErrorCode.FileReadFailed, "permission denied"));
        }
        return err(new ResultError(ErrorCode.FileNotFound, path));
      },
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({});
    }
  });

  it("skips a node_modules scope dir that fails to list", () => {
    const nodeModulesDir = "/fake/project/node_modules";
    const deps = makeDeps({
      fileExists: (path: string) => path === IOCS_PATH || path === nodeModulesDir,
      readDir: (path: string) => {
        if (path === nodeModulesDir) return ok(["@broken-scope"]);
        return err(new ResultError(ErrorCode.FileReadFailed, "cannot list scope dir"));
      },
    });

    const result = IoCScan.execute(makeInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({});
    }
  });

  it("does not throw when settings.json is unreadable during config gate", () => {
    const deps = makeDeps({
      getEnv: (key: string) => (key === "PAI_DIR" ? "/fake/home/.claude" : undefined),
    });

    expect(() => IoCScan.execute(makeInput(), deps)).not.toThrow();
  });
});

// ─── defaultDeps ─────────────────────────────────────────────────────────────

describe("IoCScan defaultDeps", () => {
  it("defaultDeps.stderr writes without throwing", () => {
    expect(() => IoCScan.defaultDeps.stderr("test")).not.toThrow();
  });

  it("defaultDeps.iocsPath points at the hook's own iocs.json", () => {
    expect(IoCScan.defaultDeps.iocsPath).toContain("iocs.json");
    expect(IoCScan.defaultDeps.iocsPath).toContain("IoCScan");
  });

  it("defaultDeps.readDir returns string[] for existing directory", () => {
    const result = IoCScan.defaultDeps.readDir(IoCScan.defaultDeps.iocsPath.replace("/iocs.json", ""));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.value)).toBe(true);
    }
  });
});
