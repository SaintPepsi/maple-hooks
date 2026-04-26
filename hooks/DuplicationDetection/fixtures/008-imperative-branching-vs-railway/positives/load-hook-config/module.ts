import { join } from "node:path";
import { readFile } from "@hooks/core/adapters/fs";
import { tryCatch } from "@hooks/core/result";

declare function readHookConfig<T>(name: string): T | null;
declare function mergeConfig<T extends object>(target: T, partial: Partial<T>): T;

export function loadHookConfig<T extends object>(
  hookName: string,
  defaults: T,
  configDir: string,
): T {
  let config = { ...defaults };

  const configPath = join(configDir, "config.json");
  const localConfig = readFile(configPath);
  if (localConfig.ok) {
    const parseResult = tryCatch(
      () => JSON.parse(localConfig.value) as Partial<T>,
      () => null,
    );
    if (parseResult.ok && parseResult.value) {
      config = mergeConfig(config, parseResult.value);
    }
  }

  const hookCfg = readHookConfig<Partial<T>>(hookName);
  if (hookCfg) {
    config = mergeConfig(config, hookCfg);
  }

  return config;
}
