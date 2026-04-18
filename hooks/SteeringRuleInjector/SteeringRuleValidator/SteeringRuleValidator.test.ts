import { describe, expect, test } from "bun:test";
import { contract, validateSteeringRule } from "./SteeringRuleValidator.contract";

describe("SteeringRuleValidator", () => {
  describe("validateSteeringRule", () => {
    test("accepts valid steering rule with all fields", () => {
      const content = `---
name: test-rule
events: [SessionStart, UserPromptSubmit]
keywords: [test, example]
---

Rule body here.`;
      const result = validateSteeringRule(content);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("accepts valid rule with empty keywords", () => {
      const content = `---
name: test-rule
events: [SessionStart]
keywords: []
---

Body`;
      const result = validateSteeringRule(content);
      expect(result.valid).toBe(true);
    });

    test("rejects missing frontmatter", () => {
      const content = "Just some text without frontmatter";
      const result = validateSteeringRule(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Missing YAML frontmatter (must start with --- and end with ---)",
      );
    });

    test("rejects missing name field", () => {
      const content = `---
events: [SessionStart]
keywords: []
---`;
      const result = validateSteeringRule(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing 'name' field in frontmatter");
    });

    test("rejects YAML list format for events", () => {
      const content = `---
name: test-rule
events:
  - SessionStart
  - UserPromptSubmit
keywords: []
---`;
      const result = validateSteeringRule(content);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("bracket syntax"))).toBe(true);
    });

    test("rejects YAML list format for keywords", () => {
      const content = `---
name: test-rule
events: [SessionStart]
keywords:
  - test
  - example
---`;
      const result = validateSteeringRule(content);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("bracket syntax"))).toBe(true);
    });

    test("rejects missing events field", () => {
      const content = `---
name: test-rule
keywords: []
---`;
      const result = validateSteeringRule(content);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("events"))).toBe(true);
    });

    test("rejects missing keywords field", () => {
      const content = `---
name: test-rule
events: [SessionStart]
---`;
      const result = validateSteeringRule(content);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("keywords"))).toBe(true);
    });
  });

  describe("contract.execute", () => {
    const mockDeps = () => ({
      stderr: () => {},
    });

    test("skips non-steering-rule files", () => {
      const input = {
        hook_event_name: "PreToolUse" as const,
        session_id: "test-session",
        tool_name: "Write",
        tool_input: {
          file_path: "/some/other/file.md",
          content: "whatever",
        },
      };
      const result = contract.execute(input, mockDeps());
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.decision).toBeUndefined();
      }
    });

    test("allows valid steering rule write", () => {
      const input = {
        hook_event_name: "PreToolUse" as const,
        session_id: "test-session",
        tool_name: "Write",
        tool_input: {
          file_path: "/path/to/steering-rules/my-rule.md",
          content: `---
name: my-rule
events: [SessionStart]
keywords: []
---

Body`,
        },
      };
      const result = contract.execute(input, mockDeps());
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.decision).toBeUndefined();
      }
    });

    test("blocks invalid steering rule write", () => {
      const input = {
        hook_event_name: "PreToolUse" as const,
        session_id: "test-session",
        tool_name: "Write",
        tool_input: {
          file_path: "/path/to/steering-rules/bad-rule.md",
          content: `---
name: bad-rule
events:
  - SessionStart
keywords: []
---`,
        },
      };
      const result = contract.execute(input, mockDeps());
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.decision).toBe("block");
        expect(result.value.reason).toContain("bracket");
      }
    });

    test("handles Edit tool with new_string", () => {
      const input = {
        hook_event_name: "PreToolUse" as const,
        session_id: "test-session",
        tool_name: "Edit",
        tool_input: {
          file_path: "/path/to/steering-rules/edited-rule.md",
          old_string: "old content",
          new_string: `---
name: edited-rule
events: [UserPromptSubmit]
keywords: [test]
---`,
        },
      };
      const result = contract.execute(input, mockDeps());
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.decision).toBeUndefined();
      }
    });
  });
});
