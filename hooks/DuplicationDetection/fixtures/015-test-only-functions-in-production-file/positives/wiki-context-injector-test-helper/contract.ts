interface WikiPageEntry {
  title: string;
  domain: string[];
  summary: string;
}

let cachedIndex: Record<string, WikiPageEntry> | null = null;
let injectedPaths: Set<string> = new Set();

export function _resetCache(): void {
  cachedIndex = null;
  injectedPaths = new Set();
}

export const WikiContextInjector = {
  name: "WikiContextInjector",
  execute(): void {
    // ... contract uses cachedIndex/injectedPaths
  },
};
