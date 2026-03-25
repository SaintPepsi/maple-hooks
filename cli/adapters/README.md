# cli/adapters/

Result-wrapped I/O adapters for the `paih` CLI. Pattern matches `core/adapters/` from the hook system.

## Files

| File | Purpose | Added in |
|------|---------|----------|
| `fs.ts` | `readFile`, `writeFile`, `fileExists`, `readDir`, `ensureDir`, `stat` — all return `Result<T, PaihError>` | #6 |
| `process.ts` | `exec`, `cwd` — Result-wrapped shell execution | #6 |
