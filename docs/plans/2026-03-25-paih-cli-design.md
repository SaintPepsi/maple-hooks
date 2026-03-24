# paih CLI — Selective Hook Installer for Claude Code

**Date:** 2026-03-25
**Status:** Approved
**Author:** Maple (for Ian)

## Problem

pai-hooks contains 48+ hooks. Currently, `install.ts` installs ALL hooks into `~/.claude/settings.json`. There's no way to:
- Install a subset of hooks into a specific project
- Share individual hooks with other Claude Code users
- Install hooks without the full PAI system
- Choose between source copy vs compiled output

## Solution

A CLI tool (`paih`) that selectively installs hooks into any Claude Code project, with dependency resolution, multiple output modes, and full lifecycle management.

## Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Target audience | Personal first, public-ready | Design for distribution but ship for personal use |
| Dependency resolution | Static manifests + verify lint | Fast installs, explicit deps, CI catches drift |
| ROP pattern | Result + pipe() (same as pai-hooks) | Consistent dialect across ecosystem, no new deps |
| Effect library | No (stayed with Result) | Simpler, same patterns as hooks, lower dep footprint |
| Default install mode | Copy source with dep tree | Self-contained, no symlink fragility |
| Target resolution | Walk up to nearest .claude/ | Natural for project-scoped installation |
| Lifecycle | Install + uninstall + update + list | Full lifecycle from v1 |

## CLI Interface

```
paih install <hooks...> [--to <path>] [--compiled | --compiled-ts] [--preset <name>]
paih uninstall <hooks...> [--from <path>]
paih update [<hooks...>] [--in <path>]
paih list [--in <path>]
paih catalog [--groups | --presets]
paih verify [--fix]
```

### Selection Resolution

Arguments are resolved in order:
1. Hook name match → install that hook
2. Group name match → install all hooks in group
3. Preset name match → install all hooks in preset

### Target Resolution

- `--to` / `--from` / `--in` → use that path
- No flag → walk up from CWD to find nearest directory containing `.claude/`
- Fail with clear error if no `.claude/` found

### Output Modes

- **Default (no flag):** Copy source files with full dependency tree
- **`--compiled`:** `bun build --target=node` per hook → single `.js` file, Node-compatible, `#!/usr/bin/env node`
- **`--compiled-ts`:** `bun build` per hook → single `.ts` file, all deps inlined, `#!/usr/bin/env bun`

## ROP Pipeline Architecture

Each command is a chain of Result-returning functions using `pipe()`:

```typescript
// install command pipeline
const result = pipe(
  parseArgs(argv),
  andThen(resolveTarget),
  andThen(resolveHooks),
  andThen(loadManifests),
  andThen(resolveDependencies),
  andThen(executeInstall),
  andThen(registerHooks),
  andThen(writeLockfile),
);
```

### Error Types

```typescript
type PaihErrorCode =
  | "TARGET_NOT_FOUND"
  | "HOOK_NOT_FOUND"
  | "MANIFEST_MISSING"
  | "MANIFEST_INVALID"
  | "DEP_NOT_FOUND"
  | "BUILD_FAILED"
  | "SETTINGS_CONFLICT"
  | "WRITE_FAILED"
  | "LOCK_CORRUPT";
```

### Dependency Injection

All I/O through injected deps (same pattern as hook contracts):

```typescript
interface InstallDeps {
  readFile: (path: string) => Result<string, PaihError>;
  writeFile: (path: string, content: string) => Result<void, PaihError>;
  copyFile: (src: string, dest: string) => Result<void, PaihError>;
  ensureDir: (path: string) => Result<void, PaihError>;
  fileExists: (path: string) => boolean;
  readDir: (path: string) => Result<string[], PaihError>;
  exec: (cmd: string, args: string[]) => Result<string, PaihError>;
  stderr: (msg: string) => void;
  stdout: (msg: string) => void;
}
```

## Manifest Format

### Per-Hook: `hook.json`

```json
{
  "name": "TypeStrictness",
  "group": "CodingStandards",
  "event": "PreToolUse",
  "description": "Blocks `any` type usage in TypeScript edits",
  "deps": {
    "core": ["contract", "result", "error", "runner", "types/hook-inputs", "types/hook-outputs", "adapters/fs"],
    "lib": ["paths"],
    "shared": true
  },
  "tags": ["quality", "typescript"],
  "presets": ["quality", "full"]
}
```

### Per-Group: `group.json`

```json
{
  "name": "CodingStandards",
  "description": "TypeScript quality enforcement hooks",
  "hooks": ["CodingStandardsAdvisor", "CodingStandardsEnforcer", "TypeStrictness", "TypeCheckVerifier", "BashWriteGuard"]
}
```

### Repo-Level: `presets.json`

```json
{
  "minimal": {
    "description": "Essential safety hooks only",
    "hooks": ["SecurityValidator", "DestructiveDeleteGuard", "ProtectedBranchGuard"]
  },
  "quality": {
    "description": "Code quality + safety",
    "groups": ["CodingStandards", "CodeQualityPipeline", "GitSafety"]
  },
  "full": {
    "description": "Everything",
    "groups": ["*"]
  }
}
```

## Installed File Layout

### Source Mode (default)

```
target-project/.claude/
  hooks/
    core/                           # shared core (deduped)
      contract.ts
      result.ts
      error.ts
      runner.ts
      types/
        hook-inputs.ts
        hook-outputs.ts
      adapters/
        fs.ts
        stdin.ts
        process.ts
    lib/                            # shared lib (only what's needed)
      paths.ts
    CodingStandards/                # group structure preserved
      shared.ts
      TypeStrictness/
        TypeStrictness.contract.ts
        TypeStrictness.hook.ts
    CodeQualityPipeline/
      shared.ts
      CodeQualityGuard/
        CodeQualityGuard.contract.ts
        CodeQualityGuard.hook.ts
    tsconfig.json                   # generated, @hooks/* aliases
    paih.lock.json                  # install tracking
  settings.json                     # hooks registered (merged)
```

### Compiled Modes

```
target-project/.claude/hooks/
  TypeStrictness.js            # --compiled: single Node-compatible file
  # OR
  TypeStrictness.ts            # --compiled-ts: single Bun file
  paih.lock.json
```

## Lockfile Format (`paih.lock.json`)

```json
{
  "version": 1,
  "source": "https://github.com/SaintPepsi/pai-hooks",
  "sourceCommit": "abc1234",
  "installedAt": "2026-03-25T06:00:00Z",
  "outputMode": "source",
  "hooks": {
    "TypeStrictness": {
      "group": "CodingStandards",
      "event": "PreToolUse",
      "files": [
        "hooks/CodingStandards/TypeStrictness/TypeStrictness.hook.ts",
        "hooks/CodingStandards/TypeStrictness/TypeStrictness.contract.ts",
        "hooks/CodingStandards/shared.ts"
      ],
      "settingsKey": "PreToolUse[3]"
    }
  },
  "sharedDeps": {
    "core": ["contract", "result", "error", "runner", "types/hook-inputs", "types/hook-outputs", "adapters/fs", "adapters/stdin", "adapters/process"],
    "lib": ["paths"]
  }
}
```

## `paih verify` Command

Validates hook.json manifests match actual imports:

1. Glob all `hook.json` files
2. Parse each contract's imports via regex
3. Compare declared deps vs actual imports
4. Report mismatches (missing or stale deps)
5. `--fix` flag rewrites hook.json to match

Designed to run in CI (pre-commit or GitHub Action).

## CLI Internal Structure

```
cli/
  bin/
    paih.ts                    # entry point
  commands/
    install.ts                 # install pipeline
    uninstall.ts
    update.ts
    list.ts
    catalog.ts
    verify.ts
  core/
    args.ts                    # arg parsing (Result-based)
    target.ts                  # .claude/ directory resolution
    resolver.ts                # hook/group/preset -> hook list
    manifest.ts                # hook.json reading/validation
    deps.ts                    # dependency deduplication
    compiler.ts                # bun build wrappers
    settings.ts                # settings.json merge/unmerge
    lockfile.ts                # paih.lock.json read/write
    result.ts                  # reuse from pai-hooks
    error.ts                   # PaihError types
    pipe.ts                    # pipe() helper for ROP chains
  adapters/
    fs.ts                      # Result-wrapped file operations
    process.ts                 # Result-wrapped exec
  types/
    manifest.ts                # HookManifest, GroupManifest, PresetConfig
    lockfile.ts                # LockfileSchema
    install-plan.ts            # InstallPlan
```

## Prerequisites

- Hooks must be migrated to grouped directory structure first (see issue #2)
- Each hook directory needs a `hook.json` manifest
- Each group directory needs a `group.json`
- Repo root needs a `presets.json`

## Non-Goals (v1)

- Publishing to npm (future consideration)
- Remote installation from git URL (local repo only for v1)
- Hook dependency ordering (hooks don't depend on each other at install time)
- Auto-updating hooks on `git pull` of pai-hooks
