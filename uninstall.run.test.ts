import { describe, it, expect } from "bun:test";
import { run, type UninstallDeps } from "@hooks/uninstall";

// ─── Test Helpers ────────────────────────────────────────────────────────────

interface Captured {
  stdoutLines: string[];
  stderrLines: string[];
  writtenFiles: Map<string, string>;
}

function makeDeps(overrides: Partial<UninstallDeps> = {}): UninstallDeps & Captured {
  const captured: Captured = {
    stdoutLines: [],
    stderrLines: [],
    writtenFiles: new Map(),
  };
  return {
    ...captured,
    readFile: () => ({ ok: true, value: "{}" }),
    writeFile: (path: string, content: string) => {
      captured.writtenFiles.set(path, content);
      return { ok: true };
    },
    fileExists: () => true,
    stderr: (msg: string) => { captured.stderrLines.push(msg); },
    stdout: (msg: string) => { captured.stdoutLines.push(msg); },
    homeDir: "/tmp/test-home",
    ...overrides,
  };
}

const validManifest = JSON.stringify({
  name: "saintpepsi-pai-hooks",
  envVar: "SAINTPEPSI_PAI_HOOKS_DIR",
});

const settingsWithHooks = JSON.stringify({
  env: { SAINTPEPSI_PAI_HOOKS_DIR: "/some/path", OTHER_VAR: "keep-me" },
  hooks: {
    PreToolUse: [
      {
        matcher: "Edit",
        hooks: [{ type: "command", command: "${SAINTPEPSI_PAI_HOOKS_DIR}/CodingStandards.hook.ts" }],
      },
      {
        matcher: "Bash",
        hooks: [{ type: "command", command: "/my/own/hook.ts" }],
      },
    ],
  },
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("uninstall run() — early returns", () => {
  it("returns early when pai-hooks.json not found", () => {
    const deps = makeDeps({
      fileExists: (path: string) => !path.includes("pai-hooks.json"),
    });
    run(deps);
    expect(deps.stderrLines.some((l) => l.includes("pai-hooks.json not found"))).toBe(true);
    expect(deps.writtenFiles.size).toBe(0);
  });

  it("returns early when settings.json not found", () => {
    const deps = makeDeps({
      fileExists: (path: string) => {
        if (path.includes(".claude") && path.endsWith("settings.json")) return false;
        return true;
      },
      readFile: () => ({ ok: true, value: validManifest }),
    });
    run(deps);
    expect(deps.stderrLines.some((l) => l.includes("not found"))).toBe(true);
    expect(deps.writtenFiles.size).toBe(0);
  });

  it("returns early when manifest readFile fails", () => {
    const deps = makeDeps({
      readFile: () => ({ ok: false, error: { message: "read error" } }),
    });
    run(deps);
    expect(deps.writtenFiles.size).toBe(0);
  });

  it("shows nothing-to-do message when env var not set", () => {
    const settingsNoEnv = JSON.stringify({ env: {}, hooks: {} });
    let callCount = 0;
    const deps = makeDeps({
      readFile: () => {
        callCount++;
        if (callCount === 1) return { ok: true, value: validManifest };
        return { ok: true, value: settingsNoEnv };
      },
    });
    run(deps);
    expect(deps.stdoutLines.some((l) => l.includes("not installed"))).toBe(true);
    expect(deps.writtenFiles.size).toBe(0);
  });
});

describe("uninstall run() — successful uninstall", () => {
  it("removes env var from settings", () => {
    let callCount = 0;
    const deps = makeDeps({
      readFile: () => {
        callCount++;
        if (callCount === 1) return { ok: true, value: validManifest };
        return { ok: true, value: settingsWithHooks };
      },
    });
    run(deps);

    expect(deps.writtenFiles.size).toBe(1);
    const written = JSON.parse([...deps.writtenFiles.values()][0]);
    expect(written.env.SAINTPEPSI_PAI_HOOKS_DIR).toBeUndefined();
  });

  it("removes hooks owned by the env var", () => {
    let callCount = 0;
    const deps = makeDeps({
      readFile: () => {
        callCount++;
        if (callCount === 1) return { ok: true, value: validManifest };
        return { ok: true, value: settingsWithHooks };
      },
    });
    run(deps);

    const written = JSON.parse([...deps.writtenFiles.values()][0]);
    // The Edit matcher group (owned by env var) should be gone
    const editMatchers = written.hooks.PreToolUse?.filter(
      (g: { matcher: string }) => g.matcher === "Edit",
    );
    expect(editMatchers?.length ?? 0).toBe(0);
  });

  it("preserves non-owned hooks", () => {
    let callCount = 0;
    const deps = makeDeps({
      readFile: () => {
        callCount++;
        if (callCount === 1) return { ok: true, value: validManifest };
        return { ok: true, value: settingsWithHooks };
      },
    });
    run(deps);

    const written = JSON.parse([...deps.writtenFiles.values()][0]);
    expect(written.hooks.PreToolUse).toHaveLength(1);
    expect(written.hooks.PreToolUse[0].matcher).toBe("Bash");
    expect(written.hooks.PreToolUse[0].hooks[0].command).toBe("/my/own/hook.ts");
  });

  it("preserves other env vars", () => {
    let callCount = 0;
    const deps = makeDeps({
      readFile: () => {
        callCount++;
        if (callCount === 1) return { ok: true, value: validManifest };
        return { ok: true, value: settingsWithHooks };
      },
    });
    run(deps);

    const written = JSON.parse([...deps.writtenFiles.values()][0]);
    expect(written.env.OTHER_VAR).toBe("keep-me");
  });

  it("reports what was removed", () => {
    let callCount = 0;
    const deps = makeDeps({
      readFile: () => {
        callCount++;
        if (callCount === 1) return { ok: true, value: validManifest };
        return { ok: true, value: settingsWithHooks };
      },
    });
    run(deps);

    expect(deps.stdoutLines.some((l) =>
      l.includes("Uninstalled") && l.includes("SAINTPEPSI_PAI_HOOKS_DIR"),
    )).toBe(true);
  });
});
