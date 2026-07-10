/**
 * SteeringRuleValidator Contract — Block malformed steering rule writes.
 *
 * PreToolUse hook that validates Write/Edit operations targeting steering-rules/*.md.
 * Ensures frontmatter uses bracket array format (events: [X]) not YAML list format
 * (events:\n  - X) since the SteeringRuleInjector parser only handles bracket format.
 *
 * See: hooks/SteeringRuleInjector/SteeringRuleInjector/SteeringRuleInjector.contract.ts:86
 */

import type { SyncHookJSONOutput } from "@anthropic-ai/claude-agent-sdk";
import type { SyncHookContract } from "@hooks/core/contract";
import type { ResultError } from "@hooks/core/error";
import { ok, type Result } from "@hooks/core/result";
import type { ToolHookInput } from "@hooks/core/types/hook-inputs";
import { defaultStderr } from "@hooks/lib/paths";
import { getFilePath } from "@hooks/lib/tool-input";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SteeringRuleValidatorDeps {
  stderr: (msg: string) => void;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Pure Functions ──────────────────────────────────────────────────────────

function getWriteContent(input: ToolHookInput): string | null {
  if (typeof input.tool_input !== "object" || input.tool_input === null) return null;
  if (input.tool_name === "Write") return (input.tool_input.content as string) ?? null;
  return null;
}

function getEditNewContent(input: ToolHookInput): string | null {
  if (typeof input.tool_input !== "object" || input.tool_input === null) return null;
  if (input.tool_name !== "Edit") return null;
  return (input.tool_input.new_string as string) ?? null;
}

/**
 * Validate steering rule frontmatter format.
 * Must have: name, events (bracket array), keywords (bracket array).
 */
export function validateSteeringRule(content: string): ValidationResult {
  const errors: string[] = [];

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    errors.push("Missing YAML frontmatter (must start with --- and end with ---)");
    return { valid: false, errors };
  }

  const yaml = frontmatterMatch[1];

  const nameMatch = yaml.match(/^name:\s*(.+)$/m);
  if (!nameMatch) {
    errors.push("Missing 'name' field in frontmatter");
  }

  const eventsMatch = yaml.match(/^events:\s*\[([^\]]*)\]$/m);
  if (!eventsMatch) {
    if (yaml.match(/^events:\s*$/m) || yaml.match(/^events:\s*\n\s+-/m)) {
      errors.push(
        "Invalid 'events' format: use bracket syntax events: [SessionStart, UserPromptSubmit] not YAML list",
      );
    } else {
      errors.push("Missing 'events' field with bracket array format: events: [SessionStart]");
    }
  }

  const keywordsMatch = yaml.match(/^keywords:\s*\[([^\]]*)\]$/m);
  if (!keywordsMatch) {
    if (yaml.match(/^keywords:\s*$/m) || yaml.match(/^keywords:\s*\n\s+-/m)) {
      errors.push(
        "Invalid 'keywords' format: use bracket syntax keywords: [word1, word2] not YAML list",
      );
    } else {
      errors.push("Missing 'keywords' field with bracket array format: keywords: []");
    }
  }

  // depends-on is optional; if present, must use bracket array form
  if (yaml.match(/^depends-on:/m)) {
    const dependsOnBracket = yaml.match(/^depends-on:\s*\[([^\]]*)\]$/m);
    if (!dependsOnBracket) {
      if (yaml.match(/^depends-on:\s*$/m) || yaml.match(/^depends-on:\s*\n\s+-/m)) {
        errors.push(
          "Invalid 'depends-on' format: use bracket syntax depends-on: [Tool(Write), Tool(Edit)] not YAML list",
        );
      } else {
        errors.push("Invalid 'depends-on' format: use bracket syntax depends-on: [Tool(Write)]");
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Contract ───────────────────────────────────────────────────────────────

const defaultDeps: SteeringRuleValidatorDeps = {
  stderr: defaultStderr,
};

export const contract: SyncHookContract<ToolHookInput, SteeringRuleValidatorDeps> = {
  name: "SteeringRuleValidator",
  event: "PreToolUse",
  defaultDeps,

  accepts: (input) => input.tool_name === "Write" || input.tool_name === "Edit",

  execute: (input, deps): Result<SyncHookJSONOutput, ResultError> => {
    const filePath = getFilePath(input);
    if (!filePath || !/\/steering-rules\/[^/]+\.md$/.test(filePath)) {
      return ok({});
    }

    const content = getWriteContent(input) ?? getEditNewContent(input);
    if (!content) {
      return ok({});
    }

    if (!content.includes("---")) {
      return ok({});
    }

    const result = validateSteeringRule(content);
    if (result.valid) {
      deps.stderr(`[SteeringRuleValidator] Valid steering rule: ${filePath}`);
      return ok({});
    }

    const errorList = result.errors.map((e) => `  - ${e}`).join("\n");

    deps.stderr(`[SteeringRuleValidator] Blocking invalid steering rule: ${filePath}`);

    return ok({
      decision: "block",
      reason: `Let me fix the steering rule format first.

Steering rule validation failed:
${errorList}

Expected format:
\`\`\`markdown
---
name: rule-name
events: [SessionStart, UserPromptSubmit]
keywords: [keyword1, keyword2]
---

Rule body content here.
\`\`\`

Use bracket array syntax, not YAML list syntax with dashes.`,
    });
  },
};
