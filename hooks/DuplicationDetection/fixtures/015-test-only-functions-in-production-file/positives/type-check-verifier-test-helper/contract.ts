const lastCheckTime = new Map<string, number>();
const DEBOUNCE_MS = 60_000;

/** Test-only: reset the debounce cache so tests start with clean state. */
export function _resetDebounceCache(): void {
  lastCheckTime.clear();
}

function isDebounced(filePath: string): boolean {
  const last = lastCheckTime.get(filePath);
  if (!last) return false;
  return Date.now() - last < DEBOUNCE_MS;
}

function markChecked(filePath: string): void {
  lastCheckTime.set(filePath, Date.now());
}

export const TypeCheckVerifier = {
  name: "TypeCheckVerifier",
  execute(): void {
    // ... contract uses isDebounced/markChecked
  },
};
