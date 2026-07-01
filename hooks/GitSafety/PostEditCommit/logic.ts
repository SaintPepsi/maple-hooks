import { basename } from "node:path";

/** The identity files that auto-commit on edit. Data, not code branches. */
export const WATCHED = [
  "CLAUDE.md",
  "souls/maple/SOUL.md",
  "souls/maple/STYLE.md",
] as const;

/**
 * If `filePath` is a watched identity file under `claudeDir`, return its
 * repo-relative path; otherwise null. Accepts `unknown` and narrows: the hook
 * input types `file_path` as unknown, so narrowing lives here (pure + tested).
 */
export function matchWatched(
  filePath: unknown,
  watched: readonly string[],
  claudeDir: string,
): string | null {
  if (typeof filePath !== "string") return null;
  const norm = filePath.replace(/^~(?=\/)/, claudeDir);
  return watched.find((rel) => norm === `${claudeDir}/${rel}`) ?? null;
}

export function commitMessage(rel: string): string {
  return `identity: edit ${basename(rel)}`;
}

/** The configured watch list, or the built-in default when unset/empty. Pure. */
export function resolveWatched(configFiles: readonly string[] | undefined): readonly string[] {
  return configFiles && configFiles.length > 0 ? configFiles : WATCHED;
}
