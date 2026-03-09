import { describe, test, expect } from "bun:test";
import { StartupGreeting, type StartupGreetingDeps } from "@hooks/contracts/StartupGreeting";
import { ok, err } from "@hooks/core/result";
import { dirCreateFailed, fileWriteFailed } from "@hooks/core/error";
import type { SessionStartInput } from "@hooks/core/types/hook-inputs";

// ─── Test Helpers ─────────────────────────────────────────────────────────────

const baseInput: SessionStartInput = {
  session_id: "test-session-123",
};

function makeDeps(overrides: Partial<StartupGreetingDeps> = {}): StartupGreetingDeps {
  return {
    readSettings: () => ok({}),
    runBanner: () => "=== PAI Banner ===",
    persistKittySession: () => {},
    isSubagent: () => false,
    getEnv: () => undefined,
    fileExists: () => false,
    ensureDir: () => ok(undefined),
    writeFile: () => ok(undefined),
    paiDir: "/tmp/test-pai",
    stderr: () => {},
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("StartupGreeting", () => {
  describe("contract metadata", () => {
    test("name is StartupGreeting", () => {
      expect(StartupGreeting.name).toBe("StartupGreeting");
    });

    test("event is SessionStart", () => {
      expect(StartupGreeting.event).toBe("SessionStart");
    });
  });

  describe("accepts", () => {
    test("accepts all SessionStart inputs", () => {
      expect(StartupGreeting.accepts(baseInput)).toBe(true);
    });

    test("accepts input with empty session_id", () => {
      expect(StartupGreeting.accepts({ session_id: "" })).toBe(true);
    });
  });

  describe("execute — subagent detection", () => {
    test("returns silent when isSubagent returns true", () => {
      const deps = makeDeps({ isSubagent: () => true });
      const result = StartupGreeting.execute(baseInput, deps);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.type).toBe("silent");
    });

    test("does not run banner when isSubagent", () => {
      let bannerCalled = false;
      const deps = makeDeps({
        isSubagent: () => true,
        runBanner: () => { bannerCalled = true; return "banner"; },
      });
      StartupGreeting.execute(baseInput, deps);
      expect(bannerCalled).toBe(false);
    });
  });

  describe("execute — kitty environment persistence with session_id", () => {
    test("calls persistKittySession when both kitty env vars are present and session_id exists", () => {
      const persistCalls: Array<{ sid: string; listenOn: string; windowId: string }> = [];
      const deps = makeDeps({
        getEnv: (key) => {
          if (key === "KITTY_LISTEN_ON") return "unix:/tmp/kitty";
          if (key === "KITTY_WINDOW_ID") return "42";
          return undefined;
        },
        persistKittySession: (sid, listenOn, windowId) => {
          persistCalls.push({ sid, listenOn, windowId });
        },
      });
      StartupGreeting.execute(baseInput, deps);
      expect(persistCalls.length).toBe(1);
      expect(persistCalls[0].sid).toBe("test-session-123");
      expect(persistCalls[0].listenOn).toBe("unix:/tmp/kitty");
      expect(persistCalls[0].windowId).toBe("42");
    });
  });

  describe("execute — kitty environment persistence without session_id", () => {
    test("writes kitty-env.json when kitty env vars present but no session_id", () => {
      let writtenPath = "";
      let writtenContent = "";
      const deps = makeDeps({
        getEnv: (key) => {
          if (key === "KITTY_LISTEN_ON") return "unix:/tmp/kitty";
          if (key === "KITTY_WINDOW_ID") return "42";
          return undefined;
        },
        ensureDir: () => ok(undefined),
        writeFile: (path, content) => {
          writtenPath = path;
          writtenContent = content;
          return ok(undefined);
        },
      });
      StartupGreeting.execute({ session_id: "" }, deps);
      expect(writtenPath).toContain("kitty-env.json");
      expect(writtenContent).toContain("KITTY_LISTEN_ON");
      expect(writtenContent).toContain("unix:/tmp/kitty");
    });

    test("calls ensureDir for state directory before writing kitty-env.json", () => {
      let ensuredPath = "";
      const deps = makeDeps({
        getEnv: (key) => {
          if (key === "KITTY_LISTEN_ON") return "unix:/tmp/kitty";
          if (key === "KITTY_WINDOW_ID") return "42";
          return undefined;
        },
        ensureDir: (path) => {
          ensuredPath = path;
          return ok(undefined);
        },
      });
      StartupGreeting.execute({ session_id: "" }, deps);
      expect(ensuredPath).toContain("MEMORY");
      expect(ensuredPath).toContain("STATE");
    });
  });

  describe("execute — no kitty environment", () => {
    test("does not persist kitty session when KITTY_LISTEN_ON is missing", () => {
      let persistCalled = false;
      const deps = makeDeps({
        getEnv: (key) => {
          if (key === "KITTY_WINDOW_ID") return "42";
          return undefined;
        },
        persistKittySession: () => { persistCalled = true; },
      });
      StartupGreeting.execute(baseInput, deps);
      expect(persistCalled).toBe(false);
    });

    test("does not persist kitty session when KITTY_WINDOW_ID is missing", () => {
      let persistCalled = false;
      const deps = makeDeps({
        getEnv: (key) => {
          if (key === "KITTY_LISTEN_ON") return "unix:/tmp/kitty";
          return undefined;
        },
        persistKittySession: () => { persistCalled = true; },
      });
      StartupGreeting.execute(baseInput, deps);
      expect(persistCalled).toBe(false);
    });
  });

  describe("execute — banner output", () => {
    test("returns context output when banner produces output", () => {
      const deps = makeDeps({ runBanner: () => "=== PAI 4.0 ===" });
      const result = StartupGreeting.execute(baseInput, deps);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe("context");
        if (result.value.type === "context") {
          expect(result.value.content).toBe("=== PAI 4.0 ===");
        }
      }
    });

    test("returns silent when banner returns null", () => {
      const deps = makeDeps({ runBanner: () => null });
      const result = StartupGreeting.execute(baseInput, deps);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.type).toBe("silent");
    });

    test("returns silent when banner returns empty string", () => {
      const deps = makeDeps({ runBanner: () => "" });
      const result = StartupGreeting.execute(baseInput, deps);
      expect(result.ok).toBe(true);
      // Empty string is falsy, so should return silent
      if (result.ok) expect(result.value.type).toBe("silent");
    });
  });
});
