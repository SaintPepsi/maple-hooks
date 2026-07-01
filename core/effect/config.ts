import { Effect, type Schema } from "effect";
import { readHookConfig } from "@hooks/lib/hook-config";
import { ConfigError } from "./errors";

/**
 * Read + validate a hook's settings.json config (`hookConfig.{hookName}`) as an
 * Effect. Fails with ConfigError when missing/invalid — compose with
 * `Effect.orElseSucceed(() => default)` for a fallback. Optional readFileFn/
 * settingsPath are pass-throughs for testing (a real temp settings file, no mocks).
 */
export const readConfig = <A>(
  hookName: string,
  schema: Schema.Schema<A>,
  readFileFn?: (path: string) => string | null,
  settingsPath?: string,
): Effect.Effect<A, ConfigError> =>
  Effect.suspend(() => {
    const result = readHookConfig(hookName, schema, readFileFn, settingsPath);
    return result.ok
      ? Effect.succeed(result.value)
      : Effect.fail(new ConfigError({ hookName, message: result.error.message }));
  });
