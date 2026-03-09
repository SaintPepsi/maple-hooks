import { describe, it, expect } from "bun:test";
import { LoadContext, type LoadContextDeps, loadPendingProposals } from "@hooks/contracts/LoadContext";
import type { SessionStartInput } from "@hooks/core/types/hook-inputs";
import type { ContextOutput, SilentOutput } from "@hooks/core/types/hook-outputs";
import type { Result } from "@hooks/core/result";
import { ok, err } from "@hooks/core/result";
import type { PaiError } from "@hooks/core/error";
import { ErrorCode, PaiError as PaiErrorClass } from "@hooks/core/error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<SessionStartInput> = {}): SessionStartInput {
  return { session_id: "test-session-123", ...overrides };
}

interface MockDirEntry {
  name: string;
  _isDir: boolean;
  isDirectory(): boolean;
}

function dirEntry(name: string, isDir: boolean): MockDirEntry {
  return { name, _isDir: isDir, isDirectory: () => isDir };
}

function makePaiError(message: string): PaiError {
  return new PaiErrorClass(ErrorCode.Unknown, message);
}

function makeDeps(overrides: Partial<LoadContextDeps> = {}): LoadContextDeps {
  return {
    fileExists: () => false,
    readFile: () => ok(""),
    readJson: () => ok({}),
    readDir: () => ok([]),
    stat: () => ok({ mtimeMs: Date.now() }),
    execSyncSafe: () => ok(""),
    setTabState: () => ok(undefined),
    readTabState: () => ok(null),
    getDAName: () => "TestDA",
    recordSessionStart: () => {},
    getCurrentDate: async () => "2026-03-09 17:00:00 AEDT",
    isSubagent: () => false,
    baseDir: "/tmp/test-pai",
    stderr: () => {},
    ...overrides,
  };
}

// ─── Contract metadata ───────────────────────────────────────────────────────

describe("LoadContext contract metadata", () => {
  it("has correct name and event", () => {
    expect(LoadContext.name).toBe("LoadContext");
    expect(LoadContext.event).toBe("SessionStart");
  });

  it("accepts all SessionStart inputs", () => {
    expect(LoadContext.accepts(makeInput())).toBe(true);
  });
});

// ─── Subagent detection ──────────────────────────────────────────────────────

describe("Subagent detection", () => {
  it("returns silent when isSubagent() is true", async () => {
    const stderrMessages: string[] = [];
    const deps = makeDeps({
      isSubagent: () => true,
      stderr: (msg) => stderrMessages.push(msg),
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("silent");
    expect(stderrMessages.some((m) => m.includes("Subagent"))).toBe(true);
  });
});

// ─── No context files ────────────────────────────────────────────────────────

describe("No context files", () => {
  it("returns silent when no context files are found", async () => {
    const deps = makeDeps({
      fileExists: () => false,
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("silent");
  });
});

// ─── loadSettings ────────────────────────────────────────────────────────────

describe("loadSettings (via execute)", () => {
  it("uses empty settings when no settings.json exists", async () => {
    // With no fileExists returning true, settings will be empty,
    // default context files used, none found => silent
    const deps = makeDeps({ fileExists: () => false });
    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // No context files found -> silent
    expect(result.value.type).toBe("silent");
  });

  it("logs error and returns empty settings when settings.json parse fails", async () => {
    const stderrMessages: string[] = [];
    const deps = makeDeps({
      fileExists: (path) => path.endsWith("settings.json"),
      readJson: () => err(makePaiError("bad json")),
      stderr: (msg) => stderrMessages.push(msg),
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    expect(stderrMessages.some((m) => m.includes("Failed to parse settings.json"))).toBe(true);
  });

  it("parses settings.json correctly and uses contextFiles", async () => {
    const deps = makeDeps({
      fileExists: (path) => path.endsWith("settings.json") || path.endsWith("custom.md"),
      readJson: () => ok({ contextFiles: ["custom.md"], principal: { name: "TestUser" }, daidentity: { name: "TestAI" } }),
      readFile: (path) => {
        if (path.endsWith("custom.md")) return ok("# Custom Context");
        return ok("");
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).toContain("TestUser");
    expect(result.value.content).toContain("TestAI");
    expect(result.value.content).toContain("# Custom Context");
  });
});

// ─── loadContextFiles ────────────────────────────────────────────────────────

describe("loadContextFiles (via execute)", () => {
  it("reads default files when no contextFiles in settings", async () => {
    const readPaths: string[] = [];
    const deps = makeDeps({
      fileExists: (path) =>
        path.endsWith("SKILL.md") ||
        path.endsWith("AISTEERINGRULES.md"),
      readFile: (path) => {
        readPaths.push(path);
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        if (path.endsWith("AISTEERINGRULES.md")) return ok("# Rules");
        return ok("");
      },
      // No settings.json means default files
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    // Should have attempted to read the default context files
    expect(readPaths.some((p) => p.includes("SKILL.md"))).toBe(true);
    expect(readPaths.some((p) => p.includes("AISTEERINGRULES.md"))).toBe(true);
  });

  it("reads custom contextFiles from settings", async () => {
    const readPaths: string[] = [];
    const deps = makeDeps({
      fileExists: (path) =>
        path.endsWith("settings.json") ||
        path.endsWith("file-a.md") ||
        path.endsWith("file-b.md"),
      readJson: () => ok({ contextFiles: ["file-a.md", "file-b.md"] }),
      readFile: (path) => {
        readPaths.push(path);
        if (path.endsWith("file-a.md")) return ok("Content A");
        if (path.endsWith("file-b.md")) return ok("Content B");
        return ok("");
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).toContain("Content A");
    expect(result.value.content).toContain("Content B");
  });

  it("logs missing context files via stderr", async () => {
    const stderrMessages: string[] = [];
    const deps = makeDeps({
      fileExists: (path) => path.endsWith("settings.json"),
      readJson: () => ok({ contextFiles: ["missing-file.md"] }),
      stderr: (msg) => stderrMessages.push(msg),
    });

    await LoadContext.execute(makeInput(), deps);

    expect(stderrMessages.some((m) => m.includes("Context file not found: missing-file.md"))).toBe(true);
  });
});

// ─── loadCodingStandards ─────────────────────────────────────────────────────

describe("loadCodingStandards (via execute)", () => {
  it("returns null when no standards dir exists (no coding standards in output)", async () => {
    const deps = makeDeps({
      fileExists: (path) =>
        path.endsWith("SKILL.md"),
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        return ok("");
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).not.toContain("Coding Standards");
  });

  it("reads general.md and domain files from standards dir", async () => {
    const deps = makeDeps({
      fileExists: (path) =>
        path.endsWith("SKILL.md") ||
        path.includes("CODINGSTANDARDS") ||
        path.endsWith("general.md") ||
        path.endsWith("hooks.md"),
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill Content");
        if (path.endsWith("general.md")) return ok("General standards here");
        if (path.endsWith("hooks.md")) return ok("Hooks standards here");
        return ok("");
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).toContain("Coding Standards");
    expect(result.value.content).toContain("General standards here");
    expect(result.value.content).toContain("Hooks standards here");
  });
});

// ─── needsSkillRebuild ──────────────────────────────────────────────────────

describe("needsSkillRebuild (via execute)", () => {
  it("triggers rebuild when SKILL.md is missing", async () => {
    const stderrMessages: string[] = [];
    const deps = makeDeps({
      fileExists: (path) => {
        // SKILL.md doesn't exist but is in default context files
        if (path.endsWith("SKILL.md")) return false;
        if (path.endsWith("AISTEERINGRULES.md")) return true;
        return false;
      },
      readFile: (path) => {
        if (path.includes("AISTEERINGRULES.md")) return ok("# Rules");
        return ok("");
      },
      execSyncSafe: () => ok("rebuilt"),
      stderr: (msg) => stderrMessages.push(msg),
    });

    await LoadContext.execute(makeInput(), deps);

    expect(stderrMessages.some((m) => m.includes("Rebuilding SKILL.md"))).toBe(true);
  });

  it("does not rebuild when SKILL.md is newer than all components", async () => {
    const now = Date.now();
    const stderrMessages: string[] = [];
    const deps = makeDeps({
      fileExists: (path) =>
        path.endsWith("SKILL.md") ||
        path.endsWith("AISTEERINGRULES.md"),
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        if (path.includes("AISTEERINGRULES.md")) return ok("# Rules");
        return ok("");
      },
      stat: (path) => {
        if (path.endsWith("SKILL.md")) return ok({ mtimeMs: now });
        // Components are older
        return ok({ mtimeMs: now - 10000 });
      },
      readDir: () => ok([]),
      stderr: (msg) => stderrMessages.push(msg),
    });

    await LoadContext.execute(makeInput(), deps);

    expect(stderrMessages.some((m) => m.includes("Rebuilding SKILL.md"))).toBe(false);
  });

  it("triggers rebuild when a component is newer than SKILL.md", async () => {
    const now = Date.now();
    const stderrMessages: string[] = [];
    const deps = makeDeps({
      fileExists: (path) =>
        path.endsWith("SKILL.md") ||
        path.includes("Components") ||
        path.endsWith("AISTEERINGRULES.md"),
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        if (path.includes("AISTEERINGRULES.md")) return ok("# Rules");
        return ok("");
      },
      stat: (path) => {
        if (path.endsWith("SKILL.md")) return ok({ mtimeMs: now - 10000 });
        // Component file is newer
        return ok({ mtimeMs: now });
      },
      readDir: (dirPath) => {
        if (dirPath.includes("Components")) {
          return ok([dirEntry("identity.md", false)]);
        }
        return ok([]);
      },
      execSyncSafe: () => ok("rebuilt"),
      stderr: (msg) => stderrMessages.push(msg),
    });

    await LoadContext.execute(makeInput(), deps);

    expect(stderrMessages.some((m) => m.includes("Rebuilding SKILL.md"))).toBe(true);
  });

  it("triggers rebuild when settings.json is newer than SKILL.md", async () => {
    const now = Date.now();
    const stderrMessages: string[] = [];
    const deps = makeDeps({
      fileExists: (path) =>
        path.endsWith("SKILL.md") ||
        path.endsWith("settings.json") ||
        path.endsWith("AISTEERINGRULES.md"),
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        if (path.includes("AISTEERINGRULES.md")) return ok("# Rules");
        return ok("");
      },
      readJson: () => ok({}),
      stat: (path) => {
        if (path.endsWith("SKILL.md")) return ok({ mtimeMs: now - 10000 });
        if (path.endsWith("settings.json")) return ok({ mtimeMs: now });
        return ok({ mtimeMs: now - 20000 });
      },
      readDir: () => ok([]),
      execSyncSafe: () => ok("rebuilt"),
      stderr: (msg) => stderrMessages.push(msg),
    });

    await LoadContext.execute(makeInput(), deps);

    expect(stderrMessages.some((m) => m.includes("Rebuilding SKILL.md"))).toBe(true);
  });

  it("logs failure when rebuild command fails", async () => {
    const stderrMessages: string[] = [];
    const deps = makeDeps({
      fileExists: (path) => {
        if (path.endsWith("SKILL.md")) return false;
        if (path.endsWith("AISTEERINGRULES.md")) return true;
        return false;
      },
      readFile: (path) => {
        if (path.includes("AISTEERINGRULES.md")) return ok("# Rules");
        return ok("");
      },
      execSyncSafe: () => err(makePaiError("command failed")),
      stderr: (msg) => stderrMessages.push(msg),
    });

    await LoadContext.execute(makeInput(), deps);

    expect(stderrMessages.some((m) => m.includes("Failed to rebuild SKILL.md"))).toBe(true);
  });

  it("handles stat failure on SKILL.md by triggering rebuild", async () => {
    const stderrMessages: string[] = [];
    const deps = makeDeps({
      fileExists: (path) =>
        path.endsWith("SKILL.md") ||
        path.endsWith("AISTEERINGRULES.md"),
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        if (path.includes("AISTEERINGRULES.md")) return ok("# Rules");
        return ok("");
      },
      stat: (path) => {
        if (path.endsWith("SKILL.md")) return err(makePaiError("stat failed"));
        return ok({ mtimeMs: Date.now() });
      },
      readDir: () => ok([]),
      execSyncSafe: () => ok("rebuilt"),
      stderr: (msg) => stderrMessages.push(msg),
    });

    await LoadContext.execute(makeInput(), deps);

    expect(stderrMessages.some((m) => m.includes("Rebuilding SKILL.md"))).toBe(true);
  });

  it("recurses into subdirectories of Components", async () => {
    const now = Date.now();
    const stderrMessages: string[] = [];
    const deps = makeDeps({
      fileExists: (path) =>
        path.endsWith("SKILL.md") ||
        path.includes("Components") ||
        path.endsWith("AISTEERINGRULES.md"),
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        if (path.includes("AISTEERINGRULES.md")) return ok("# Rules");
        return ok("");
      },
      stat: (path) => {
        if (path.endsWith("SKILL.md")) return ok({ mtimeMs: now - 10000 });
        if (path.endsWith("deep-file.md")) return ok({ mtimeMs: now });
        return ok({ mtimeMs: now - 20000 });
      },
      readDir: (dirPath) => {
        if (dirPath.endsWith("Components")) {
          return ok([dirEntry("subdir", true)]);
        }
        if (dirPath.endsWith("subdir")) {
          return ok([dirEntry("deep-file.md", false)]);
        }
        return ok([]);
      },
      execSyncSafe: () => ok("rebuilt"),
      stderr: (msg) => stderrMessages.push(msg),
    });

    await LoadContext.execute(makeInput(), deps);

    expect(stderrMessages.some((m) => m.includes("Rebuilding SKILL.md"))).toBe(true);
  });
});

// ─── loadRelationshipContext ─────────────────────────────────────────────────

describe("loadRelationshipContext (via execute)", () => {
  it("outputs no Relationship Context when no opinions file exists", async () => {
    const deps = makeDeps({
      fileExists: (path) =>
        path.endsWith("SKILL.md"),
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        return ok("");
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).not.toContain("Relationship Context");
  });

  it("extracts high-confidence opinions", async () => {
    const opinionsContent = [
      "### Prefers functional patterns",
      "**Confidence:** 0.92",
      "",
      "### Likes TypeScript",
      "**Confidence:** 0.50",
      "",
      "### Values clarity over cleverness",
      "**Confidence:** 0.88",
    ].join("\n");

    const deps = makeDeps({
      fileExists: (path) =>
        path.endsWith("SKILL.md") ||
        path.endsWith("OPINIONS.md"),
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        if (path.endsWith("OPINIONS.md")) return ok(opinionsContent);
        return ok("");
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).toContain("Relationship Context");
    expect(result.value.content).toContain("Prefers functional patterns");
    expect(result.value.content).toContain("92%");
    // Low confidence should NOT be included
    expect(result.value.content).not.toContain("Likes TypeScript");
    // High confidence should be included
    expect(result.value.content).toContain("Values clarity over cleverness");
    expect(result.value.content).toContain("88%");
  });

  it("reads recent daily relationship notes", async () => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const formatMonth = (d: Date) => d.toISOString().slice(0, 7);
    const todayStr = formatDate(today);
    const monthStr = formatMonth(today);

    const dailyNotes = "# Daily Notes\n- Had a good conversation about code quality\n- Discussed testing patterns\n";

    const deps = makeDeps({
      fileExists: (path) => {
        if (path.endsWith("SKILL.md")) return true;
        if (path.includes("RELATIONSHIP") && path.includes(monthStr) && path.includes(todayStr)) return true;
        return false;
      },
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        if (path.includes(todayStr)) return ok(dailyNotes);
        return ok("");
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).toContain("Recent Relationship Notes");
    expect(result.value.content).toContain("good conversation");
  });
});

// ─── getRecentWorkSessions / buildActiveWorkSummary ─────────────────────────

describe("getRecentWorkSessions / buildActiveWorkSummary (via execute)", () => {
  it("outputs no ACTIVE WORK when MEMORY/WORK does not exist", async () => {
    const deps = makeDeps({
      fileExists: (path) =>
        path.endsWith("SKILL.md"),
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        return ok("");
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).not.toContain("ACTIVE WORK");
  });

  it("shows recent work sessions within 48h cutoff", async () => {
    const now = new Date();
    const y = now.getFullYear().toString();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    const dirName = `${y}${mo}${d}-${h}${mi}${s}_test-feature-work`;
    const metaContent = `title: "Working on test feature implementation"\nstatus: IN_PROGRESS\nsession_id: "sess-abc-123"`;

    const deps = makeDeps({
      fileExists: (path) => {
        if (path.endsWith("SKILL.md")) return true;
        if (path.endsWith("WORK")) return true;
        if (path.endsWith("META.yaml")) return true;
        return false;
      },
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        if (path.endsWith("META.yaml")) return ok(metaContent);
        return ok("");
      },
      readDir: (dirPath) => {
        if (dirPath.endsWith("WORK")) {
          return ok([dirEntry(dirName, true)]);
        }
        // Inside the session dir, return no PRD files
        return ok([]);
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).toContain("ACTIVE WORK");
    expect(result.value.content).toContain("Working on test feature implementation");
    expect(result.value.content).toContain("IN_PROGRESS");
  });

  it("skips COMPLETED sessions", async () => {
    const now = new Date();
    const y = now.getFullYear().toString();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dirName = `${y}${mo}${d}-120000_completed-task-item`;

    const deps = makeDeps({
      fileExists: (path) => {
        if (path.endsWith("SKILL.md")) return true;
        if (path.endsWith("WORK")) return true;
        if (path.endsWith("META.yaml")) return true;
        return false;
      },
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        if (path.endsWith("META.yaml")) return ok(`title: "Completed task"\nstatus: COMPLETED`);
        return ok("");
      },
      readDir: (dirPath) => {
        if (dirPath.endsWith("WORK")) {
          return ok([dirEntry(dirName, true)]);
        }
        return ok([]);
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).not.toContain("ACTIVE WORK");
  });

  it("reads PRD metadata from work session directories", async () => {
    const now = new Date();
    const y = now.getFullYear().toString();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dirName = `${y}${mo}${d}-120000_prd-feature-work`;
    const metaContent = `title: "Feature with PRD tracking enabled"\nstatus: IN_PROGRESS`;
    const prdContent = `id: PRD-42\nstatus: IMPLEMENTING\nverification_summary: "3/5"`;

    const deps = makeDeps({
      fileExists: (path) => {
        if (path.endsWith("SKILL.md")) return true;
        if (path.endsWith("WORK")) return true;
        if (path.endsWith("META.yaml")) return true;
        return false;
      },
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        if (path.endsWith("META.yaml")) return ok(metaContent);
        if (path.endsWith("PRD-42.md")) return ok(prdContent);
        return ok("");
      },
      readDir: (dirPath) => {
        if (dirPath.endsWith("WORK")) {
          return ok([dirEntry(dirName, true)]);
        }
        // Inside the session dir
        return ok([dirEntry("PRD-42.md", false)]);
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).toContain("PRD-42");
    expect(result.value.content).toContain("IMPLEMENTING");
    expect(result.value.content).toContain("3/5");
  });

  it("skips sessions with short titles", async () => {
    const now = new Date();
    const y = now.getFullYear().toString();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dirName = `${y}${mo}${d}-120000_short-ti`;

    const deps = makeDeps({
      fileExists: (path) => {
        if (path.endsWith("SKILL.md")) return true;
        if (path.endsWith("WORK")) return true;
        if (path.endsWith("META.yaml")) return true;
        return false;
      },
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        if (path.endsWith("META.yaml")) return ok(`title: "Too short"\nstatus: IN_PROGRESS`);
        return ok("");
      },
      readDir: (dirPath) => {
        if (dirPath.endsWith("WORK")) {
          return ok([dirEntry(dirName, true)]);
        }
        return ok([]);
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).not.toContain("ACTIVE WORK");
  });

  it("uses session-names.json for friendly titles", async () => {
    const now = new Date();
    const y = now.getFullYear().toString();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dirName = `${y}${mo}${d}-120000_some-feature-slug`;
    const metaContent = `title: "Some feature slug original"\nstatus: IN_PROGRESS\nsession_id: "sess-xyz"`;

    const deps = makeDeps({
      fileExists: (path) => {
        if (path.endsWith("SKILL.md")) return true;
        if (path.endsWith("WORK")) return true;
        if (path.endsWith("META.yaml")) return true;
        if (path.endsWith("session-names.json")) return true;
        return false;
      },
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        if (path.endsWith("META.yaml")) return ok(metaContent);
        return ok("");
      },
      readJson: (path) => {
        if (path.endsWith("session-names.json")) return ok({ "sess-xyz": "Friendly Session Name Here" });
        return ok({});
      },
      readDir: (dirPath) => {
        if (dirPath.endsWith("WORK")) {
          return ok([dirEntry(dirName, true)]);
        }
        return ok([]);
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).toContain("Friendly Session Name Here");
  });

  it("truncates long titles to 60 chars", async () => {
    const now = new Date();
    const y = now.getFullYear().toString();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dirName = `${y}${mo}${d}-120000_long-title-task`;
    const longTitle = "A".repeat(80);
    const metaContent = `title: "${longTitle}"\nstatus: IN_PROGRESS`;

    const deps = makeDeps({
      fileExists: (path) => {
        if (path.endsWith("SKILL.md")) return true;
        if (path.endsWith("WORK")) return true;
        if (path.endsWith("META.yaml")) return true;
        return false;
      },
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        if (path.endsWith("META.yaml")) return ok(metaContent);
        return ok("");
      },
      readDir: (dirPath) => {
        if (dirPath.endsWith("WORK")) {
          return ok([dirEntry(dirName, true)]);
        }
        return ok([]);
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    // Should be truncated with "..."
    expect(result.value.content).toContain("...");
    expect(result.value.content).not.toContain(longTitle);
  });

  it("deduplicates sessions by session_id", async () => {
    const now = new Date();
    const y = now.getFullYear().toString();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dir1 = `${y}${mo}${d}-120000_same-session-work-first`;
    const dir2 = `${y}${mo}${d}-110000_same-session-work-second`;

    const deps = makeDeps({
      fileExists: (path) => {
        if (path.endsWith("SKILL.md")) return true;
        if (path.endsWith("WORK")) return true;
        if (path.endsWith("META.yaml")) return true;
        return false;
      },
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        if (path.endsWith("META.yaml")) {
          return ok(`title: "Duplicate session test work"\nstatus: IN_PROGRESS\nsession_id: "same-sess-id"`);
        }
        return ok("");
      },
      readDir: (dirPath) => {
        if (dirPath.endsWith("WORK")) {
          return ok([
            dirEntry(dir1, true),
            dirEntry(dir2, true),
          ]);
        }
        return ok([]);
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    // Should only show once despite two dirs with same session_id
    const matches = result.value.content.match(/Duplicate session test work/g);
    expect(matches?.length).toBe(1);
  });
});

// ─── Tab state ───────────────────────────────────────────────────────────────

describe("Tab state management", () => {
  it("preserves working tab state through compaction", async () => {
    const stderrMessages: string[] = [];
    let tabSetCalled = false;
    const deps = makeDeps({
      fileExists: (path) => path.endsWith("SKILL.md"),
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        return ok("");
      },
      readTabState: () => ok({ state: "working" }),
      setTabState: () => {
        tabSetCalled = true;
        return ok(undefined);
      },
      stderr: (msg) => stderrMessages.push(msg),
    });

    await LoadContext.execute(makeInput(), deps);

    expect(stderrMessages.some((m) => m.includes("preserving title through compaction"))).toBe(true);
    // Should NOT have called setTabState since we are preserving the working state
    expect(tabSetCalled).toBe(false);
  });

  it("preserves thinking tab state through compaction", async () => {
    const stderrMessages: string[] = [];
    let tabSetCalled = false;
    const deps = makeDeps({
      fileExists: (path) => path.endsWith("SKILL.md"),
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        return ok("");
      },
      readTabState: () => ok({ state: "thinking" }),
      setTabState: () => {
        tabSetCalled = true;
        return ok(undefined);
      },
      stderr: (msg) => stderrMessages.push(msg),
    });

    await LoadContext.execute(makeInput(), deps);

    expect(stderrMessages.some((m) => m.includes("preserving title through compaction"))).toBe(true);
    expect(tabSetCalled).toBe(false);
  });

  it("sets idle when tab not in working state", async () => {
    let tabSetArgs: { title: string; state: string; sessionId: string } | undefined;
    const deps = makeDeps({
      fileExists: (path) => path.endsWith("SKILL.md"),
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        return ok("");
      },
      readTabState: () => ok(null),
      setTabState: (opts) => {
        tabSetArgs = opts;
        return ok(undefined);
      },
    });

    await LoadContext.execute(makeInput(), deps);

    expect(tabSetArgs).toBeDefined();
    expect(tabSetArgs?.state).toBe("idle");
    expect(tabSetArgs?.sessionId).toBe("test-session-123");
  });

  it("sets idle when readTabState returns a non-working state", async () => {
    let tabSetArgs: { title: string; state: string; sessionId: string } | undefined;
    const deps = makeDeps({
      fileExists: (path) => path.endsWith("SKILL.md"),
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill");
        return ok("");
      },
      readTabState: () => ok({ state: "idle" }),
      setTabState: (opts) => {
        tabSetArgs = opts;
        return ok(undefined);
      },
    });

    await LoadContext.execute(makeInput(), deps);

    expect(tabSetArgs).toBeDefined();
    expect(tabSetArgs?.state).toBe("idle");
  });
});

// ─── Full execute ────────────────────────────────────────────────────────────

describe("Full execute assembly", () => {
  it("produces context output with all sections assembled", async () => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const formatMonth = (d: Date) => d.toISOString().slice(0, 7);
    const todayStr = formatDate(today);
    const monthStr = formatMonth(today);

    const now = new Date();
    const y = now.getFullYear().toString();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const workDirName = `${y}${mo}${dd}-120000_full-test-feature`;

    const deps = makeDeps({
      fileExists: (path) => {
        if (path.endsWith("settings.json")) return true;
        if (path.endsWith("SKILL.md")) return true;
        if (path.endsWith("OPINIONS.md")) return true;
        if (path.includes("CODINGSTANDARDS")) return true;
        if (path.endsWith("general.md")) return true;
        if (path.endsWith("WORK")) return true;
        if (path.endsWith("META.yaml")) return true;
        if (path.includes("RELATIONSHIP") && path.includes(monthStr) && path.includes(todayStr)) return true;
        return false;
      },
      readJson: (path) => {
        if (path.endsWith("settings.json")) {
          return ok({
            contextFiles: ["PAI/SKILL.md"],
            principal: { name: "TestUser" },
            daidentity: { name: "TestDA" },
          });
        }
        return ok({});
      },
      readFile: (path) => {
        if (path.endsWith("SKILL.md")) return ok("# Skill Content Here");
        if (path.endsWith("OPINIONS.md")) return ok("### Strong opinion here\n**Confidence:** 0.95\n");
        if (path.endsWith("general.md")) return ok("# General coding standards");
        if (path.includes(todayStr)) return ok("- Had a productive session\n");
        if (path.endsWith("META.yaml")) return ok(`title: "Full test feature implementation work"\nstatus: IN_PROGRESS`);
        return ok("");
      },
      readDir: (dirPath) => {
        if (dirPath.endsWith("WORK")) {
          return ok([dirEntry(workDirName, true)]);
        }
        return ok([]);
      },
      stat: () => ok({ mtimeMs: Date.now() }),
      getCurrentDate: async () => "2026-03-09 17:00:00 AEDT",
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;

    const content = result.value.content;
    // Core structure
    expect(content).toContain("PAI CONTEXT");
    expect(content).toContain("2026-03-09 17:00:00 AEDT");
    expect(content).toContain("test-session-123");

    // Identity
    expect(content).toContain("TestUser");
    expect(content).toContain("TestDA");

    // Context files
    expect(content).toContain("# Skill Content Here");

    // Coding standards
    expect(content).toContain("Coding Standards");
    expect(content).toContain("General coding standards");

    // Relationship context
    expect(content).toContain("Relationship Context");
    expect(content).toContain("Strong opinion here");
    expect(content).toContain("95%");

    // Active work
    expect(content).toContain("ACTIVE WORK");
    expect(content).toContain("Full test feature implementation work");
  });

  it("calls recordSessionStart", async () => {
    let recorded = false;
    const deps = makeDeps({
      fileExists: (path) => path.endsWith("SKILL.md"),
      readFile: () => ok("# Skill"),
      recordSessionStart: () => { recorded = true; },
    });

    await LoadContext.execute(makeInput(), deps);

    expect(recorded).toBe(true);
  });

  it("uses default principal and DA names when not in settings", async () => {
    const deps = makeDeps({
      fileExists: (path) =>
        path.endsWith("settings.json") ||
        path.endsWith("SKILL.md"),
      readJson: () => ok({}), // no principal or daidentity
      readFile: () => ok("# Content"),
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).toContain("User");
    expect(result.value.content).toContain("PAI");
  });

  it("includes the canary string in output", async () => {
    const deps = makeDeps({
      fileExists: (path) => path.endsWith("SKILL.md"),
      readFile: () => ok("# Skill"),
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).toContain("CANARY");
    expect(result.value.content).toContain("penguin");
  });

  it("concatenates multiple context files with separator", async () => {
    const deps = makeDeps({
      fileExists: (path) =>
        path.endsWith("settings.json") ||
        path.endsWith("a.md") ||
        path.endsWith("b.md"),
      readJson: () => ok({ contextFiles: ["a.md", "b.md"] }),
      readFile: (path) => {
        if (path.endsWith("a.md")) return ok("Content A");
        if (path.endsWith("b.md")) return ok("Content B");
        return ok("");
      },
    });

    const result = await LoadContext.execute(makeInput(), deps) as Result<ContextOutput | SilentOutput, PaiError>;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("context");
    if (result.value.type !== "context") return;
    expect(result.value.content).toContain("Content A");
    expect(result.value.content).toContain("---");
    expect(result.value.content).toContain("Content B");
  });
});

// ─── loadPendingProposals (direct unit tests) ────────────────────────────────

describe("loadPendingProposals", () => {
  it("returns null when proposals dir does not exist", () => {
    const deps = makeDeps({ fileExists: () => false });
    const result = loadPendingProposals("/tmp/test", deps);
    expect(result).toBeNull();
  });

  it("returns null when .analyzing lock is fresh", () => {
    const deps = makeDeps({
      fileExists: () => true,
      stat: () => ok({ mtimeMs: Date.now() }),
    });
    const result = loadPendingProposals("/tmp/test", deps);
    expect(result).toBeNull();
  });

  it("returns proposals when .analyzing lock is stale", () => {
    const deps = makeDeps({
      fileExists: () => true,
      stat: () => ok({ mtimeMs: Date.now() - 11 * 60 * 1000 }),
      readDir: () => ok([dirEntry("prop.md", false)]),
      readFile: () => ok("---\ncategory: hook\n---\n\n# Proposal: Test Proposal\n"),
    });
    const result = loadPendingProposals("/tmp/test", deps);
    expect(result).not.toBeNull();
    expect(result).toContain("Test Proposal");
    expect(result).toContain("hook");
  });

  it("returns null when readDir fails", () => {
    const deps = makeDeps({
      fileExists: (path) => !path.endsWith(".analyzing"),
      readDir: () => err(makePaiError("readdir failed")),
    });
    const result = loadPendingProposals("/tmp/test", deps);
    expect(result).toBeNull();
  });

  it("returns null when no .md files in proposals", () => {
    const deps = makeDeps({
      fileExists: (path) => !path.endsWith(".analyzing"),
      readDir: () => ok([dirEntry(".gitkeep", false)]),
    });
    const result = loadPendingProposals("/tmp/test", deps);
    expect(result).toBeNull();
  });

  it("falls back to 'general' when no category in frontmatter", () => {
    const deps = makeDeps({
      fileExists: (path) => !path.endsWith(".analyzing"),
      readDir: () => ok([dirEntry("test.md", false)]),
      readFile: () => ok("---\nid: PROP-1\n---\n\n# Proposal: No Category Test\n"),
    });
    const result = loadPendingProposals("/tmp/test", deps);
    expect(result).not.toBeNull();
    expect(result).toContain("general");
  });

  it("shows overflow count when more than 5 proposals", () => {
    const entries = Array.from({ length: 7 }, (_, i) => dirEntry(`p${i}.md`, false));
    const deps = makeDeps({
      fileExists: (path) => !path.endsWith(".analyzing"),
      readDir: () => ok(entries),
      readFile: (path) => {
        const idx = path.match(/p(\d)/)?.[1] ?? "0";
        return ok(`---\ncategory: test\n---\n\n# Proposal: Item ${idx}\n`);
      },
    });
    const result = loadPendingProposals("/tmp/test", deps);
    expect(result).not.toBeNull();
    expect(result).toContain("**7**");
    expect(result).toContain("...and 2 more");
  });

  it("uses singular 'proposal' for count of 1", () => {
    const deps = makeDeps({
      fileExists: (path) => !path.endsWith(".analyzing"),
      readDir: () => ok([dirEntry("single.md", false)]),
      readFile: () => ok("---\ncategory: memory\n---\n\n# Proposal: Single Item\n"),
    });
    const result = loadPendingProposals("/tmp/test", deps);
    expect(result).not.toBeNull();
    expect(result).toContain("**1** pending improvement proposal");
    expect(result).not.toContain("proposals");
  });
});
