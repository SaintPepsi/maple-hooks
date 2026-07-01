import { toRepoRel } from "./toRepoRel";

/**
 * If `filePath` matches a watched entry (compared as repo-relative paths under
 * `claudeDir`, regardless of the form each is written in — repo-relative,
 * absolute, or `~/`-prefixed), return its repo-relative path; else null.
 * `filePath` is unknown (hook input) and narrowed here. Pure.
 */
export function matchWatched(
  filePath: unknown,
  watched: readonly string[],
  claudeDir: string,
): string | null {
  if (typeof filePath !== "string") return null;
  const target = toRepoRel(filePath, claudeDir);
  if (target === null) return null;
  for (const w of watched) {
    if (toRepoRel(w, claudeDir) === target) return target;
  }
  return null;
}
