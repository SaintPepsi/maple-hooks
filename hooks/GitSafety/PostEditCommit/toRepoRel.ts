import { dirname } from "node:path";

/**
 * Normalize a path to repo-relative under `claudeDir`. Accepts three forms:
 *   1. repo-relative — `"CLAUDE.md"`                    → `"CLAUDE.md"`
 *   2. `~/`-prefixed — `"~/.claude/CLAUDE.md"`          → `"CLAUDE.md"`
 *   3. absolute      — `"/Users/you/.claude/CLAUDE.md"` → `"CLAUDE.md"`
 *
 * `~` expands to the home dir (the parent of `claudeDir`), so the natural,
 * portable `~/.claude/...` form resolves correctly and — unlike an absolute
 * path — never bakes a username into committed config.
 *
 * Returns null if the path resolves OUTSIDE `claudeDir`, or to `claudeDir`
 * itself (the repo root is not a watchable file — an empty rel would make a
 * later `git add -- ""` stage the whole repo).
 *
 * Pure. macOS/Linux paths.
 */
export function toRepoRel(path: string, claudeDir: string): string | null {
  const home = dirname(claudeDir);
  const abs = path.startsWith("~/")
    ? home + path.slice(1)
    : path.startsWith("/")
      ? path
      : `${claudeDir}/${path}`;
  const prefix = `${claudeDir}/`;
  if (!abs.startsWith(prefix)) return null;
  const rel = abs.slice(prefix.length);
  return rel === "" ? null : rel; // empty rel = repo root; never a watched file
}
