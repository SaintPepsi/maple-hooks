interface ViolationCacheEntry {
  hash: string;
  timestamp: number;
  editCount: number;
}

const reportedViolations = new Map<string, ViolationCacheEntry>();

/** Test-only: reset the violation dedup cache so tests start with clean state. */
export function _resetViolationCache(): void {
  reportedViolations.clear();
}

/** Test-only: inject a cache entry directly to simulate prior edits or elapsed time. */
export function _setViolationCacheEntry(filePath: string, entry: ViolationCacheEntry): void {
  reportedViolations.set(filePath, entry);
}

/** Test-only: read a cache entry to retrieve the hash the contract stored. */
export function _getViolationCacheEntry(filePath: string): ViolationCacheEntry | undefined {
  return reportedViolations.get(filePath);
}

export const CodeQualityGuard = {
  name: "CodeQualityGuard",
  execute(): void {
    // ... contract body uses reportedViolations directly
  },
};
