/**
 * DefaultEffort Contract — Set default effort level based on model.
 *
 * Reads hookConfig.defaultEffort mapping model IDs to effort levels,
 * then injects a system instruction for the configured effort.
 * Skips for subagents.
 */

import type { SyncHookJSONOutput } from "@anthropic-ai/claude-agent-sdk";
import { getEnv } from "@hooks/core/adapters/process";
import type { SyncHookContract } from "@hooks/core/contract";
import type { ResultError } from "@hooks/core/error";
import { ok, type Result } from "@hooks/core/result";
import type { SessionStartInput } from "@hooks/core/types/hook-inputs";
import { isSubagentDefault } from "@hooks/lib/environment";
import { readHookConfig } from "@hooks/lib/hook-config";
import { defaultStderr } from "@hooks/lib/paths";
import { Schema } from "effect";

// ─── Types ───────────────────────────────────────────────────────────────────

export type EffortLevel = "low" | "medium" | "high" | "max";

const EffortLevelSchema = Schema.Union(
  Schema.Literal("low"),
  Schema.Literal("medium"),
  Schema.Literal("high"),
  Schema.Literal("max"),
);

const ConfigSchema = Schema.Struct({
  models: Schema.Record({ key: Schema.String, value: EffortLevelSchema }),
  enabled: Schema.optional(Schema.Boolean),
});

export type DefaultEffortConfig = Schema.Schema.Type<typeof ConfigSchema>;

export interface DefaultEffortDeps {
  readConfig: () => Result<DefaultEffortConfig, ResultError> | null;
  getModel: () => string | null;
  isSubagent: () => boolean;
  stderr: (msg: string) => void;
}

// ─── Effort Instructions ─────────────────────────────────────────────────────

const EFFORT_INSTRUCTIONS: Record<EffortLevel, string> = {
  low: "Use minimal reasoning depth. Respond concisely without extended analysis.",
  medium: "Use moderate reasoning depth. Balance thoroughness with efficiency.",
  high: "Use thorough reasoning. Consider multiple approaches before responding.",
  max: "Use MAXIMUM reasoning depth. Think step-by-step, consider edge cases, verify your logic, and explore alternatives before concluding. Take your time.",
};

// ─── Default Implementations ─────────────────────────────────────────────────

function defaultReadConfig(): Result<DefaultEffortConfig, ResultError> | null {
  const result = readHookConfig("defaultEffort", ConfigSchema);
  if (!result.ok) return null;
  return result;
}

function defaultGetModel(): string | null {
  const anthropic = getEnv("ANTHROPIC_MODEL");
  if (anthropic.ok && anthropic.value) return anthropic.value;
  const claude = getEnv("CLAUDE_MODEL");
  if (claude.ok && claude.value) return claude.value;
  return null;
}

// ─── Contract ────────────────────────────────────────────────────────────────

const defaultDeps: DefaultEffortDeps = {
  readConfig: defaultReadConfig,
  getModel: defaultGetModel,
  isSubagent: isSubagentDefault,
  stderr: defaultStderr,
};

export const DefaultEffort: SyncHookContract<SessionStartInput, DefaultEffortDeps> = {
  name: "DefaultEffort",
  event: "SessionStart",

  accepts(_input: SessionStartInput): boolean {
    return true;
  },

  execute(
    _input: SessionStartInput,
    deps: DefaultEffortDeps,
  ): Result<SyncHookJSONOutput, ResultError> {
    if (deps.isSubagent()) {
      return ok({});
    }

    const configResult = deps.readConfig();
    if (!configResult?.ok) {
      return ok({});
    }

    const config = configResult.value;
    if (config.enabled === false) {
      return ok({});
    }

    const model = deps.getModel();
    if (!model) {
      deps.stderr("[DefaultEffort] No model detected, skipping effort injection");
      return ok({});
    }

    const effort = config.models[model];
    if (!effort) {
      deps.stderr(`[DefaultEffort] No effort configured for model: ${model}`);
      return ok({});
    }

    const instruction = EFFORT_INSTRUCTIONS[effort];
    deps.stderr(`[DefaultEffort] Injecting ${effort} effort for ${model}`);

    return ok({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: `<system-reminder>\n**EFFORT LEVEL: ${effort.toUpperCase()}**\n\n${instruction}\n</system-reminder>`,
      },
    });
  },

  defaultDeps,
};
