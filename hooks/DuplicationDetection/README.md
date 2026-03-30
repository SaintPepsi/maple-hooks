# DuplicationDetection

Detects duplicated functions across the codebase and warns before writing code that already exists elsewhere.

## Hooks

### DuplicationIndexBuilder (PostToolUse)

Fires after any Write or Edit to a `.ts` file. Scans the project root and builds `index.json` — a compact lookup structure of all functions with their body hashes, names, parameter signatures, and fingerprints. Skips rebuild if the index was written within the last 30 minutes.

See [`DuplicationIndexBuilder/README.md`](DuplicationIndexBuilder/README.md) for details.

### DuplicationChecker (PreToolUse)

Fires before any Write or Edit to a `.ts` file. Parses the incoming content, extracts functions, and checks them against the index. If a function matches on 3 or more dimensions (body hash, name frequency, signature + fingerprint similarity), it surfaces an advisory via `additionalContext`. The agent can proceed — this hook never blocks.

Every check (clean or with findings) is logged to `/tmp/pai/duplication/{hash}/{branch}/checker.jsonl` as JSONL for later inspection.

## How They Work Together

```
Write/Edit .ts file
       │
       ├─► PreToolUse: DuplicationChecker
       │     reads /tmp/pai/duplication/{hash}/{branch}/index.json
       │     parses incoming content
       │     emits additionalContext if duplicates found
       │     logs check to /tmp/pai/duplication/{hash}/{branch}/checker.jsonl
       │
       └─► PostToolUse: DuplicationIndexBuilder
             scans project root
             writes /tmp/pai/duplication/{hash}/{branch}/index.json
             (skips if index is fresh)
```

The builder produces the index; the checker reads it. On a first run (no index yet) the checker skips silently and the builder creates the index after the write completes. Subsequent writes benefit from the index immediately.

### Branch Awareness

Each branch gets its own artifact directory: `/tmp/pai/duplication/{hash}/{branch}/{branch}/`. Switching branches means the builder and checker automatically use a separate index and log. No rebuild needed when switching back — the previous branch's index persists.

### Monorepo Behavior

SessionStart pre-warming uses CWD to find the project root. In monorepos, CWD is typically the repo root. The builder scans from the nearest project marker (`.git`, `package.json`, `composer.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`).

For monorepos without a root `package.json`, the first PostToolUse event on a subproject file builds the index for that subproject. Each subproject gets its own index scoped to its root.

## File Structure

```
DuplicationDetection/
├── README.md                          — this file
├── shared.ts                          — index types, loading, cache, check logic, formatting, getCurrentBranch
├── parser.ts                          — TypeScript function extraction
├── index-builder-logic.ts             — file scanning and index construction
├── DuplicationIndexBuilder/
│   ├── README.md
│   ├── DuplicationIndexBuilder.contract.ts
│   ├── DuplicationIndexBuilder.hook.ts
│   ├── DuplicationIndexBuilder.test.ts
│   ├── hook.json
│   └── settings.hooks.json
└── DuplicationChecker/
    ├── DuplicationChecker.contract.ts
    ├── DuplicationChecker.hook.ts
    ├── DuplicationChecker.test.ts
    ├── hook.json
    └── settings.hooks.json
```

## Manually Building the Index

To build or rebuild the index outside of a hook run:

```sh
bun Tools/pattern-detector/variants/index-builder.ts build <dir>
```

For example, from the pai-hooks root:

```sh
bun Tools/pattern-detector/variants/index-builder.ts build /Users/hogers//tmp/pai/duplication/{hash}/{branch}/pai-hooks
```

The index is written to `index.json` in the target directory.

## Inspecting the Log

Every DuplicationChecker invocation logs a JSONL entry to `/tmp/pai/duplication/{hash}/{branch}/checker.jsonl`:

```sh
# View all entries (replace {hash} with your project hash)
cat /tmp/pai/duplication/{hash}/{branch}/checker.jsonl | jq .

# View only findings (non-empty matches)
cat /tmp/pai/duplication/{hash}/{branch}/checker.jsonl | jq 'select(.matches | length > 0)'

# Count findings per file
cat /tmp/pai/duplication/{hash}/{branch}/checker.jsonl | jq -r 'select(.matches | length > 0) | .file' | sort | uniq -c | sort -rn
```

Both the index and the log live in `/tmp/pai/duplication/{project-hash}/`, outside the project tree. No gitignore entries needed.
