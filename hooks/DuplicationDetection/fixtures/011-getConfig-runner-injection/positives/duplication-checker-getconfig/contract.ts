declare function loadHookConfig<T extends object>(name: string, defaults: T, dir: string): T;

interface DuplicationCheckerConfig {
  blocking: boolean;
  inferenceEnabled: boolean;
}

const DEFAULT_CONFIG: DuplicationCheckerConfig = {
  blocking: true,
  inferenceEnabled: false,
};

const getConfig = (): DuplicationCheckerConfig =>
  loadHookConfig("duplicationChecker", DEFAULT_CONFIG, __dirname);

function readBlockingConfig(): boolean {
  return getConfig().blocking;
}

function readInferenceConfig(): boolean {
  return getConfig().inferenceEnabled;
}

export { getConfig, readBlockingConfig, readInferenceConfig };
