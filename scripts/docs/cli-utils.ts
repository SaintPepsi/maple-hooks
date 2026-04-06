/**
 * Shared CLI utilities for docs scripts.
 */

/** Extract a flag value from process.argv, with a fallback default. */
export function getArg(args: string[], flag: string, fallback: string): string {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}
