declare function loadHookConfig<T extends object>(name: string, defaults: T, dir: string): T;

interface SessionAutoRenameConfig {
  enabled?: boolean;
  intervalMinutes?: number;
  convergenceCount?: number;
}

const DEFAULT_CONFIG: SessionAutoRenameConfig = {
  enabled: true,
  intervalMinutes: 15,
  convergenceCount: 2,
};

const getConfig = (): SessionAutoRenameConfig =>
  loadHookConfig("sessionAutoRename", DEFAULT_CONFIG, __dirname);

export { getConfig };
