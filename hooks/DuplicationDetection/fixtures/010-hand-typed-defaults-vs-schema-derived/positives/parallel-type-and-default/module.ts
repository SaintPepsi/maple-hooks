interface CodingStandardsEnforcerConfig {
  exportDefault?: {
    allowPatterns?: string[];
  };
  skipFiles?: string[];
}

const DEFAULT_CONFIG: CodingStandardsEnforcerConfig = {
  exportDefault: { allowPatterns: [] },
  skipFiles: [],
};

export type { CodingStandardsEnforcerConfig };
export { DEFAULT_CONFIG };
