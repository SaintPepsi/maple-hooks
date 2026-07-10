/** Set of content hashes already injected this session — prevents duplicates. */
let injectedHashes: Set<string> = new Set();

/** Track whether we've injected this session (first Write/Edit only). */
let hasInjectedThisSession = false;

/** Reset session state — exposed for testing only. */
export function _resetSessionState(): void {
  injectedHashes = new Set();
  hasInjectedThisSession = false;
}

export const CodingStandardsInjector = {
  name: "CodingStandardsInjector",
  execute(): void {
    // ... contract uses injectedHashes/hasInjectedThisSession
  },
};
