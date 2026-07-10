declare function loadHookConfig<T extends object>(name: string, defaults: T, dir: string): T;

interface RebaseGuardConfig {
  protectedBranches: string[];
  allowOntoRebase: boolean;
}

const DEFAULT_CONFIG: RebaseGuardConfig = {
  protectedBranches: ["main", "master"],
  allowOntoRebase: true,
};

const getConfig = (): RebaseGuardConfig => loadHookConfig("rebaseGuard", DEFAULT_CONFIG, __dirname);

export { getConfig };
