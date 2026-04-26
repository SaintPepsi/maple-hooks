declare function loadHookConfig<T extends object>(name: string, defaults: T, dir: string): T;

export interface SteeringRuleConfig {
  enabled: boolean;
  includes: string[];
  trackerDir: string;
}

const DEFAULT_CONFIG: SteeringRuleConfig = {
  enabled: true,
  includes: [],
  trackerDir: "MEMORY/STATE/.injections",
};

const getConfig = (): SteeringRuleConfig =>
  loadHookConfig("steeringRuleInjector", DEFAULT_CONFIG, __dirname);

export { getConfig };
