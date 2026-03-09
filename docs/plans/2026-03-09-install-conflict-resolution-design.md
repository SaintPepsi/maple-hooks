# Install Conflict Resolution

## Problem

When `bun run install-hooks` merges hooks into `~/.claude/settings.json`, the user may already have hooks with the same name from a different source (e.g., a PAI install or manual additions). The current install script blindly appends, resulting in duplicate hooks firing.

## Hook Name Extraction

Extract the hook name from any command string by taking the basename and stripping all extensions:

```typescript
function extractHookName(command: string): string {
  const basename = command.split("/").pop() || command;
  return basename.split(".")[0];
}
```

This handles any extension pattern: `.hook.ts`, `.sh`, `.py`, etc.

## Conflict Detection

A conflict exists when:
- An incoming hook (from `settings.hooks.json`) has the same extracted name as an existing hook in `settings.json`
- The existing hook is NOT owned by this env var (i.e., not already a pai-hooks entry)

Hooks with different names on the same matcher+event are not conflicts.

## Resolution Flow

### Zero conflicts

Install silently, same behavior as today.

### 1+ conflicts

Print a summary table:

```
  Conflict: SecurityValidator
    Existing: ${PAI_DIR}/hooks/SecurityValidator.hook.ts
    Incoming: ${SAINTPEPSI_PAI_HOOKS_DIR}/hooks/SecurityValidator.hook.ts

  Conflict: BashWriteGuard
    Existing: /home/user/.claude/hooks/BashWriteGuard.sh
    Incoming: ${SAINTPEPSI_PAI_HOOKS_DIR}/hooks/BashWriteGuard.hook.ts

  3 conflicts found. Non-conflicting hooks will be installed regardless.

  [k]eep all existing  [r]eplace all  [b]oth  [a]sk per hook
```

Options:
- **keep** — skip conflicting incoming hooks, install everything else
- **replace** — remove the existing entries, install the incoming ones
- **both** — keep existing AND install incoming (both fire on the same event)
- **ask** — per-hook interactive prompt with the same k/r/b options

### Non-interactive mode

CLI flags skip the prompt for scripting/CI:

```bash
bun run install-hooks --replace    # replace all conflicts
bun run install-hooks --keep       # keep all existing on conflict
bun run install-hooks --both       # install both on conflict
```

## Implementation Scope

### Files to modify

- `install.ts` — add conflict detection, prompt logic, CLI flag parsing
- `install.run.test.ts` — add conflict scenario tests

### New functions

- `extractHookName(command: string): string` — basename sans extensions
- `detectConflicts(existing, incoming, ownEnvVar): Conflict[]` — find name matches
- `promptConflictResolution(conflicts): Promise<Resolution>` — interactive prompt
- `applyResolution(settings, conflicts, resolution): Settings` — apply user choice

### Types

```typescript
interface Conflict {
  name: string;
  event: string;
  matcher?: string;
  existingCommand: string;
  incomingCommand: string;
}

type Resolution = "keep" | "replace" | "both";
type ConflictResolutions = Map<string, Resolution>; // per-hook when "ask"
```
