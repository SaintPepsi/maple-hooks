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
