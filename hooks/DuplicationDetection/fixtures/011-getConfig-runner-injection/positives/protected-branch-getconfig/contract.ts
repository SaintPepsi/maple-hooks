declare function loadHookConfig<T extends object>(name: string, defaults: T, dir: string): T;

interface ProtectedBranchGuardConfig {
  exemptDirs: string[];
}

const DEFAULT_CONFIG: ProtectedBranchGuardConfig = {
  exemptDirs: [],
};

const getConfig = (): ProtectedBranchGuardConfig =>
  loadHookConfig("protectedBranchGuard", DEFAULT_CONFIG, __dirname);

export { getConfig };
