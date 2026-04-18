import { describe, expect, test } from "bun:test";
import { ok } from "@hooks/core/result";
import type { SessionStartInput } from "@hooks/core/types/hook-inputs";
import {
  DefaultEffort,
  type DefaultEffortConfig,
  type DefaultEffortDeps,
} from "@hooks/hooks/SessionFraming/DefaultEffort/DefaultEffort.contract";

const makeInput = (overrides: Partial<SessionStartInput> = {}): SessionStartInput => ({
  session_id: "test-session",
  ...overrides,
});

const makeDeps = (overrides: Partial<DefaultEffortDeps> = {}): DefaultEffortDeps => ({
  readConfig: () =>
    ok({
      models: { "claude-opus-4-5-20251101": "max" },
    } as DefaultEffortConfig),
  getModel: () => "claude-opus-4-5-20251101",
  isSubagent: () => false,
  stderr: () => {},
  ...overrides,
});

describe("DefaultEffort", () => {
  describe("accepts", () => {
    test("accepts all SessionStart inputs", () => {
      expect(DefaultEffort.accepts(makeInput())).toBe(true);
    });
  });

  describe("execute", () => {
    test("returns empty for subagents", () => {
      const deps = makeDeps({ isSubagent: () => true });
      const result = DefaultEffort.execute(makeInput(), deps);
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({});
    });

    test("returns empty when config is not found", () => {
      const deps = makeDeps({ readConfig: () => null });
      const result = DefaultEffort.execute(makeInput(), deps);
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({});
    });

    test("returns empty when config is disabled", () => {
      const deps = makeDeps({
        readConfig: () =>
          ok({
            models: { "claude-opus-4-5-20251101": "max" },
            enabled: false,
          } as DefaultEffortConfig),
      });
      const result = DefaultEffort.execute(makeInput(), deps);
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({});
    });

    test("returns empty when no model detected", () => {
      const messages: string[] = [];
      const deps = makeDeps({
        getModel: () => null,
        stderr: (msg) => messages.push(msg),
      });
      const result = DefaultEffort.execute(makeInput(), deps);
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({});
      expect(messages).toContain("[DefaultEffort] No model detected, skipping effort injection");
    });

    test("returns empty when model not in config", () => {
      const messages: string[] = [];
      const deps = makeDeps({
        getModel: () => "claude-sonnet-4-5-20251101",
        stderr: (msg) => messages.push(msg),
      });
      const result = DefaultEffort.execute(makeInput(), deps);
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({});
      expect(messages.some((m) => m.includes("No effort configured for model"))).toBe(true);
    });

    test("injects max effort instruction for configured model", () => {
      const messages: string[] = [];
      const deps = makeDeps({
        stderr: (msg) => messages.push(msg),
      });
      const result = DefaultEffort.execute(makeInput(), deps);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.continue).toBe(true);
      expect(result.value.hookSpecificOutput).toBeDefined();

      const output = result.value.hookSpecificOutput as {
        hookEventName: string;
        additionalContext: string;
      };
      expect(output.hookEventName).toBe("SessionStart");
      expect(output.additionalContext).toContain("EFFORT LEVEL: MAX");
      expect(output.additionalContext).toContain("MAXIMUM reasoning depth");
      expect(messages.some((m) => m.includes("Injecting max effort"))).toBe(true);
    });

    test("injects low effort instruction", () => {
      const deps = makeDeps({
        readConfig: () =>
          ok({
            models: { "claude-haiku-4-5-20251001": "low" },
          } as DefaultEffortConfig),
        getModel: () => "claude-haiku-4-5-20251001",
      });
      const result = DefaultEffort.execute(makeInput(), deps);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const output = result.value.hookSpecificOutput as {
        additionalContext: string;
      };
      expect(output.additionalContext).toContain("EFFORT LEVEL: LOW");
      expect(output.additionalContext).toContain("minimal reasoning depth");
    });

    test("injects medium effort instruction", () => {
      const deps = makeDeps({
        readConfig: () =>
          ok({
            models: { "claude-sonnet-4-5-20251101": "medium" },
          } as DefaultEffortConfig),
        getModel: () => "claude-sonnet-4-5-20251101",
      });
      const result = DefaultEffort.execute(makeInput(), deps);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const output = result.value.hookSpecificOutput as {
        additionalContext: string;
      };
      expect(output.additionalContext).toContain("EFFORT LEVEL: MEDIUM");
      expect(output.additionalContext).toContain("moderate reasoning depth");
    });

    test("injects high effort instruction", () => {
      const deps = makeDeps({
        readConfig: () =>
          ok({
            models: { "claude-opus-4-5-20251101": "high" },
          } as DefaultEffortConfig),
        getModel: () => "claude-opus-4-5-20251101",
      });
      const result = DefaultEffort.execute(makeInput(), deps);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const output = result.value.hookSpecificOutput as {
        additionalContext: string;
      };
      expect(output.additionalContext).toContain("EFFORT LEVEL: HIGH");
      expect(output.additionalContext).toContain("thorough reasoning");
    });
  });

  describe("contract metadata", () => {
    test("has correct name", () => {
      expect(DefaultEffort.name).toBe("DefaultEffort");
    });

    test("has correct event", () => {
      expect(DefaultEffort.event).toBe("SessionStart");
    });

    test("has defaultDeps", () => {
      expect(DefaultEffort.defaultDeps).toBeDefined();
    });
  });
});
