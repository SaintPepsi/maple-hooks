/**
 * Normalize a path to repo-relative under `claudeDir`. Accepts three input forms:
 *   1. repo-relative  — `"CLAUDE.md"`            → `"CLAUDE.md"`
 *   2. absolute        — `"<claudeDir>/CLAUDE.md"` → `"CLAUDE.md"`
 *   3. `~/`-prefixed   — `"~/CLAUDE.md"`          → `"CLAUDE.md"`
 * Returns null if the path resolves OUTSIDE `claudeDir`, or to `claudeDir` itself
 * (the repo root is not a watchable file — and an empty rel would make a later
 * `git add -- ""` stage the whole repo). It can't be committed from that repo.
 *
 * IMPORTANT: `~/` expands to `claudeDir` itself (which IS `~/.claude`), so
 * `~/CLAUDE.md` → `<claudeDir>/CLAUDE.md` ✓ but `~/.claude/CLAUDE.md` →
 * `<claudeDir>/.claude/CLAUDE.md` ✗ (a nonexistent nested `.claude`). To write a
 * literal home path, use the absolute form (`/Users/you/.claude/CLAUDE.md`) or
 * plain repo-relative (`CLAUDE.md`). The `~/` form means `~/<repo-relative>`.
 *
 * Pure. macOS/Linux paths.
 */
export function toRepoRel(path: string, claudeDir: string): string | null {
  const abs = path.startsWith("~/")
    ? claudeDir + path.slice(1)
    : path.startsWith("/")
      ? path
      : `${claudeDir}/${path}`;
  const prefix = `${claudeDir}/`;
  if (!abs.startsWith(prefix)) return null;
  const rel = abs.slice(prefix.length);
  return rel === "" ? null : rel; // empty rel = repo root; never a watched file
}
