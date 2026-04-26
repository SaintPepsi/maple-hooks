declare function loadHookConfig<T extends object>(name: string, defaults: T, dir: string): T;

interface CodingStandardsEnforcerConfig {
  exportDefault?: { allowPatterns?: string[] };
  skipFiles?: string[];
}

const DEFAULT_CONFIG: CodingStandardsEnforcerConfig = {
  exportDefault: { allowPatterns: [] },
  skipFiles: [],
};

const getConfig = (): CodingStandardsEnforcerConfig =>
  loadHookConfig("codingStandards", DEFAULT_CONFIG, __dirname);

export { getConfig };
