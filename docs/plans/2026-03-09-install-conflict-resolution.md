# Install Conflict Resolution — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Detect hook name collisions during install and let the user choose keep/replace/both per conflict.

**Architecture:** Add conflict detection between the "read settings" and "merge" steps in `install.ts`. Pure functions for extraction and detection, injectable prompt for testability. CLI flags for non-interactive mode.

**Tech Stack:** Bun, bun:test, existing adapter pattern (Result type, Deps injection)

**Design doc:** `docs/plans/2026-03-09-install-conflict-resolution-design.md`

---

### Task 1: extractHookName utility

**Files:**
- Modify: `install.ts` (add function + export)
- Modify: `install.run.test.ts` (add tests)

**Step 1: Write failing tests**

Add to `install.run.test.ts`:

```typescript
import { extractHookName } from "@hooks/install";

describe("extractHookName", () => {
  it("extracts name from env var path with .hook.ts", () => {
    expect(extractHookName("${SAINTPEPSI_PAI_HOOKS_DIR}/hooks/SecurityValidator.hook.ts"))
      .toBe("SecurityValidator");
  });

  it("extracts name from absolute path with .hook.ts", () => {
    expect(extractHookName("/home/user/.claude/hooks/SecurityValidator.hook.ts"))
      .toBe("SecurityValidator");
  });

  it("extracts name from .sh extension", () => {
    expect(extractHookName("/usr/local/bin/my-guard.sh"))
      .toBe("my-guard");
  });

  it("extracts name from .py extension", () => {
    expect(extractHookName("${SOME_DIR}/hooks/Validator.py"))
      .toBe("Validator");
  });

  it("handles bare filename", () => {
    expect(extractHookName("SecurityValidator.hook.ts"))
      .toBe("SecurityValidator");
  });

  it("handles filename with no extension", () => {
    expect(extractHookName("my-hook"))
      .toBe("my-hook");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test install.run.test.ts`
Expected: FAIL — `extractHookName` is not exported from `install.ts`

**Step 3: Write implementation**

Add to `install.ts` above the Core Logic section:

```typescript
export function extractHookName(command: string): string {
  const basename = command.split("/").pop() || command;
  return basename.split(".")[0];
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test install.run.test.ts`
Expected: All `extractHookName` tests PASS

**Step 5: Commit**

```bash
git add install.ts install.run.test.ts
git commit -m "feat(install): add extractHookName utility"
```

---

### Task 2: detectConflicts function

**Files:**
- Modify: `install.ts` (add types + function + export)
- Modify: `install.run.test.ts` (add tests)

**Step 1: Write failing tests**

Add types import and tests to `install.run.test.ts`:

```typescript
import { extractHookName, detectConflicts, type Conflict } from "@hooks/install";

describe("detectConflicts", () => {
  it("returns empty array when no conflicts", () => {
    const existing = {
      PreToolUse: [
        { matcher: "Bash", hooks: [{ type: "command", command: "${PAI_DIR}/hooks/MyCustomHook.hook.ts" }] },
      ],
    };
    const incoming = {
      PreToolUse: [
        { matcher: "Edit", hooks: [{ type: "command", command: "${SAINTPEPSI_PAI_HOOKS_DIR}/hooks/CodingStandards.hook.ts" }] },
      ],
    };
    expect(detectConflicts(existing, incoming, "SAINTPEPSI_PAI_HOOKS_DIR")).toEqual([]);
  });

  it("detects conflict when same hook name exists from different source", () => {
    const existing = {
      PreToolUse: [
        { matcher: "Edit", hooks: [{ type: "command", command: "${PAI_DIR}/hooks/SecurityValidator.hook.ts" }] },
      ],
    };
    const incoming = {
      PreToolUse: [
        { matcher: "Bash", hooks: [{ type: "command", command: "${SAINTPEPSI_PAI_HOOKS_DIR}/hooks/SecurityValidator.hook.ts" }] },
      ],
    };
    const conflicts = detectConflicts(existing, incoming, "SAINTPEPSI_PAI_HOOKS_DIR");
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].name).toBe("SecurityValidator");
    expect(conflicts[0].existingCommand).toContain("PAI_DIR");
    expect(conflicts[0].incomingCommand).toContain("SAINTPEPSI_PAI_HOOKS_DIR");
  });

  it("ignores hooks already owned by the same env var", () => {
    const existing = {
      PreToolUse: [
        { matcher: "Edit", hooks: [{ type: "command", command: "${SAINTPEPSI_PAI_HOOKS_DIR}/hooks/SecurityValidator.hook.ts" }] },
      ],
    };
    const incoming = {
      PreToolUse: [
        { matcher: "Edit", hooks: [{ type: "command", command: "${SAINTPEPSI_PAI_HOOKS_DIR}/hooks/SecurityValidator.hook.ts" }] },
      ],
    };
    expect(detectConflicts(existing, incoming, "SAINTPEPSI_PAI_HOOKS_DIR")).toEqual([]);
  });

  it("detects conflicts across different events", () => {
    const existing = {
      PostToolUse: [
        { matcher: "Write", hooks: [{ type: "command", command: "/custom/path/BashWriteGuard.sh" }] },
      ],
    };
    const incoming = {
      PreToolUse: [
        { matcher: "Bash", hooks: [{ type: "command", command: "${SAINTPEPSI_PAI_HOOKS_DIR}/hooks/BashWriteGuard.hook.ts" }] },
      ],
    };
    const conflicts = detectConflicts(existing, incoming, "SAINTPEPSI_PAI_HOOKS_DIR");
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].name).toBe("BashWriteGuard");
  });

  it("deduplicates conflicts when same name appears in multiple events", () => {
    const existing = {
      PreToolUse: [
        { matcher: "Bash", hooks: [{ type: "command", command: "${PAI_DIR}/hooks/SecurityValidator.hook.ts" }] },
      ],
      PostToolUse: [
        { matcher: "Bash", hooks: [{ type: "command", command: "${PAI_DIR}/hooks/SecurityValidator.hook.ts" }] },
      ],
    };
    const incoming = {
      PreToolUse: [
        { matcher: "Bash", hooks: [{ type: "command", command: "${SAINTPEPSI_PAI_HOOKS_DIR}/hooks/SecurityValidator.hook.ts" }] },
      ],
    };
    const conflicts = detectConflicts(existing, incoming, "SAINTPEPSI_PAI_HOOKS_DIR");
    expect(conflicts).toHaveLength(1);
  });

  it("handles matcher groups without matcher field (SessionEnd style)", () => {
    const existing = {
      SessionEnd: [
        { hooks: [{ type: "command", command: "${PAI_DIR}/hooks/SessionSummary.hook.ts" }] },
      ],
    };
    const incoming = {
      SessionEnd: [
        { hooks: [{ type: "command", command: "${SAINTPEPSI_PAI_HOOKS_DIR}/hooks/SessionSummary.hook.ts" }] },
      ],
    };
    const conflicts = detectConflicts(existing, incoming, "SAINTPEPSI_PAI_HOOKS_DIR");
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].name).toBe("SessionSummary");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test install.run.test.ts`
Expected: FAIL — `detectConflicts` not exported

**Step 3: Write implementation**

Add to `install.ts`:

```typescript
export interface Conflict {
  name: string;
  existingCommand: string;
  incomingCommand: string;
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
```

**Step 4: Run tests to verify they pass**

Run: `bun test install.run.test.ts`
Expected: All `detectConflicts` tests PASS

**Step 5: Commit**

```bash
git add install.ts install.run.test.ts
git commit -m "feat(install): add conflict detection between existing and incoming hooks"
```

---

### Task 3: CLI flag parsing

**Files:**
- Modify: `install.ts` (add parseConflictFlag + update Deps)
- Modify: `install.run.test.ts` (add tests)

**Step 1: Write failing tests**

```typescript
import { parseConflictFlag, type ConflictMode } from "@hooks/install";

describe("parseConflictFlag", () => {
  it("returns null when no flag provided", () => {
    expect(parseConflictFlag([])).toBeNull();
  });

  it("parses --replace flag", () => {
    expect(parseConflictFlag(["--replace"])).toBe("replace");
  });

  it("parses --keep flag", () => {
    expect(parseConflictFlag(["--keep"])).toBe("keep");
  });

  it("parses --both flag", () => {
    expect(parseConflictFlag(["--both"])).toBe("both");
  });

  it("ignores unrelated flags", () => {
    expect(parseConflictFlag(["--verbose", "--debug"])).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test install.run.test.ts`
Expected: FAIL

**Step 3: Write implementation**

Add to `install.ts`:

```typescript
export type ConflictMode = "keep" | "replace" | "both";

export function parseConflictFlag(args: string[]): ConflictMode | null {
  if (args.includes("--replace")) return "replace";
  if (args.includes("--keep")) return "keep";
  if (args.includes("--both")) return "both";
  return null;
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test install.run.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add install.ts install.run.test.ts
git commit -m "feat(install): add CLI flag parsing for conflict mode"
```

---

### Task 4: Conflict prompt and resolution application

**Files:**
- Modify: `install.ts` (add prompt dep, update mergeHooksIntoSettings, update run)
- Modify: `install.run.test.ts` (add integration tests)

**Step 1: Write failing tests for conflict integration**

```typescript
describe("install run() — conflict resolution", () => {
  const settingsWithExistingHook = JSON.stringify({
    env: {},
    hooks: {
      PreToolUse: [
        {
          matcher: "Edit",
          hooks: [{ type: "command", command: "${PAI_DIR}/hooks/CodingStandards.hook.ts" }],
        },
      ],
    },
  });

  it("installs without prompt when no conflicts", () => {
    let callCount = 0;
    const deps = makeDeps({
      readFile: () => {
        callCount++;
        if (callCount === 1) return { ok: true, value: validManifest };
        if (callCount === 2) return { ok: true, value: validExported };
        return { ok: true, value: emptySettings };
      },
    });
    run(deps);
    expect(deps.writtenFiles.size).toBe(1);
  });

  it("replaces conflicting hooks when --replace flag is set", () => {
    let callCount = 0;
    const deps = makeDeps({
      readFile: () => {
        callCount++;
        if (callCount === 1) return { ok: true, value: validManifest };
        if (callCount === 2) return { ok: true, value: validExported };
        return { ok: true, value: settingsWithExistingHook };
      },
      argv: ["--replace"],
    });
    run(deps);

    const written = JSON.parse([...deps.writtenFiles.values()][0]);
    const editHooks = written.hooks.PreToolUse
      .filter((g: MatcherGroup) => g.matcher === "Edit")
      .flatMap((g: MatcherGroup) => g.hooks);

    // Should only have the incoming one, not the PAI_DIR one
    expect(editHooks.every((h: HookEntry) => h.command.includes("SAINTPEPSI_PAI_HOOKS_DIR"))).toBe(true);
  });

  it("keeps existing hooks when --keep flag is set", () => {
    let callCount = 0;
    const deps = makeDeps({
      readFile: () => {
        callCount++;
        if (callCount === 1) return { ok: true, value: validManifest };
        if (callCount === 2) return { ok: true, value: validExported };
        return { ok: true, value: settingsWithExistingHook };
      },
      argv: ["--keep"],
    });
    run(deps);

    const written = JSON.parse([...deps.writtenFiles.values()][0]);
    const editHooks = written.hooks.PreToolUse
      .filter((g: MatcherGroup) => g.matcher === "Edit")
      .flatMap((g: MatcherGroup) => g.hooks);

    // Should have the PAI_DIR one, not the incoming one
    const codingStandardsHooks = editHooks.filter((h: HookEntry) =>
      extractHookName(h.command) === "CodingStandards"
    );
    expect(codingStandardsHooks).toHaveLength(1);
    expect(codingStandardsHooks[0].command).toContain("PAI_DIR");
  });

  it("keeps both when --both flag is set", () => {
    let callCount = 0;
    const deps = makeDeps({
      readFile: () => {
        callCount++;
        if (callCount === 1) return { ok: true, value: validManifest };
        if (callCount === 2) return { ok: true, value: validExported };
        return { ok: true, value: settingsWithExistingHook };
      },
      argv: ["--both"],
    });
    run(deps);

    const written = JSON.parse([...deps.writtenFiles.values()][0]);
    const editHooks = written.hooks.PreToolUse
      .filter((g: MatcherGroup) => g.matcher === "Edit")
      .flatMap((g: MatcherGroup) => g.hooks);

    const codingStandardsHooks = editHooks.filter((h: HookEntry) =>
      extractHookName(h.command) === "CodingStandards"
    );
    expect(codingStandardsHooks).toHaveLength(2);
  });

  it("prints conflict summary to stdout", () => {
    let callCount = 0;
    const deps = makeDeps({
      readFile: () => {
        callCount++;
        if (callCount === 1) return { ok: true, value: validManifest };
        if (callCount === 2) return { ok: true, value: validExported };
        return { ok: true, value: settingsWithExistingHook };
      },
      argv: ["--replace"],
    });
    run(deps);

    expect(deps.stdoutLines.some((l) => l.includes("conflict") || l.includes("Conflict"))).toBe(true);
    expect(deps.stdoutLines.some((l) => l.includes("CodingStandards"))).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test install.run.test.ts`
Expected: FAIL — `argv` not in InstallDeps, conflict logic not wired

**Step 3: Write implementation**

Update `InstallDeps` to include `argv` and `prompt`:

```typescript
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
```

Update `defaultDeps`:

```typescript
const defaultDeps: InstallDeps = {
  // ... existing ...
  argv: process.argv.slice(2),
  prompt: async (question: string) => {
    process.stdout.write(question);
    for await (const line of console) {
      return line.trim().toLowerCase();
    }
    return "k";
  },
};
```

Update `run()` to: detect conflicts after reading settings, check CLI flags, print summary, apply resolution before merge. The key change is that `mergeHooksIntoSettings` receives a filtered version of the exported hooks based on the resolution.

**Step 4: Run tests to verify they pass**

Run: `bun test install.run.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add install.ts install.run.test.ts
git commit -m "feat(install): wire conflict detection and resolution into install flow"
```

---

### Task 5: Interactive prompt (async run)

**Files:**
- Modify: `install.ts` (make run async, add prompt flow)
- Modify: `install.run.test.ts` (update tests for async)

**Step 1: Write failing test for interactive prompt**

```typescript
describe("install run() — interactive prompt", () => {
  it("prompts user when conflicts exist and no CLI flag", async () => {
    const settingsWithConflict = JSON.stringify({
      env: {},
      hooks: {
        PreToolUse: [
          { matcher: "Edit", hooks: [{ type: "command", command: "${PAI_DIR}/hooks/CodingStandards.hook.ts" }] },
        ],
      },
    });
    let callCount = 0;
    let promptCalled = false;
    const deps = makeDeps({
      readFile: () => {
        callCount++;
        if (callCount === 1) return { ok: true, value: validManifest };
        if (callCount === 2) return { ok: true, value: validExported };
        return { ok: true, value: settingsWithConflict };
      },
      argv: [],
      prompt: async () => { promptCalled = true; return "r"; },
    });
    await run(deps);
    expect(promptCalled).toBe(true);
  });

  it("skips prompt when no conflicts exist", async () => {
    let callCount = 0;
    let promptCalled = false;
    const deps = makeDeps({
      readFile: () => {
        callCount++;
        if (callCount === 1) return { ok: true, value: validManifest };
        if (callCount === 2) return { ok: true, value: validExported };
        return { ok: true, value: emptySettings };
      },
      argv: [],
      prompt: async () => { promptCalled = true; return "r"; },
    });
    await run(deps);
    expect(promptCalled).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test install.run.test.ts`
Expected: FAIL — run is not async, prompt not wired for interactive

**Step 3: Implement**

Make `run()` async. When conflicts are detected and no CLI flag is set, call `deps.prompt()` with the formatted conflict summary and options. Parse the response to determine resolution.

**Step 4: Run tests to verify they pass**

Run: `bun test install.run.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `bun test`
Expected: All tests pass (no regressions from async change)

**Step 6: Commit**

```bash
git add install.ts install.run.test.ts
git commit -m "feat(install): add interactive conflict resolution prompt"
```

---

### Task 6: Update README and final verification

**Files:**
- Modify: `README.md` (document conflict resolution)

**Step 1: Add conflict resolution docs to README**

Add a subsection under Quick Start or a new section explaining:
- What happens when conflicts are detected
- The interactive prompt options (keep/replace/both/ask)
- CLI flags for non-interactive mode

**Step 2: Run full test suite**

Run: `bun test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add conflict resolution section to README"
```
