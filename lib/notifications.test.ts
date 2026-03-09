/**
 * Unit tests for notification service.
 *
 * Mocks @hooks/lib/identity and uses temp directories + fetch mocking
 * to exercise all exported functions without side effects.
 */
import { mock, describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  fileExists,
  readFile,
  writeFile,
  removeFile,
  ensureDir,
} from "@hooks/core/adapters/fs";
import { join } from "path";
import { tmpdir } from "os";

// Mock the identity module before importing notifications
mock.module("@hooks/lib/identity", () => ({
  getIdentity: () => ({
    name: "TestDA",
    fullName: "Test Digital Assistant",
    displayName: "Test DA",
    mainDAVoiceID: "",
    color: "#3B82F6",
  }),
  getPrincipal: () => ({ name: "TestUser", pronunciation: "", timezone: "UTC" }),
  clearCache: () => {},
  getDAName: () => "TestDA",
  getPrincipalName: () => "TestUser",
  getVoiceId: () => "",
  getSettings: () => ({}),
  getDefaultIdentity: () => ({
    name: "TestDA",
    fullName: "Test Digital Assistant",
    displayName: "Test DA",
    mainDAVoiceID: "",
    color: "#3B82F6",
  }),
  getDefaultPrincipal: () => ({ name: "User", pronunciation: "", timezone: "UTC" }),
  getVoiceProsody: () => undefined,
  getVoicePersonality: () => undefined,
}));

import {
  getNotificationConfig,
  recordSessionStart,
  getSessionDurationMinutes,
  isLongRunningTask,
  sendPush,
  notify,
  notifyTaskComplete,
  notifyBackgroundAgent,
  notifyError,
} from "@hooks/lib/notifications";

// ─── Deps ────────────────────────────────────────────────────────────────────

interface TestEnvDeps {
  getEnv: (key: string) => string | undefined;
  setEnv: (key: string, value: string) => void;
  deleteEnv: (key: string) => void;
}

const defaultDeps: TestEnvDeps = {
  getEnv: (key: string) => process.env[key],
  setEnv: (key: string, value: string) => { process.env[key] = value; },
  deleteEnv: (key: string) => { delete process.env[key]; },
};

// ─── Test Helpers ────────────────────────────────────────────────────────────

const SESSION_START_FILE = "/tmp/pai-session-start.txt";
const env = defaultDeps;

let tempDir: string;
let savedPaiDir: string | undefined;
let savedFetch: typeof globalThis.fetch;

function createTempDir(): string {
  const base = join(tmpdir(), "notifications-test-" + Date.now());
  ensureDir(base);
  return base;
}

function setPaiDir(value: string | undefined): void {
  if (value === undefined) {
    env.deleteEnv("PAI_DIR");
  } else {
    env.setEnv("PAI_DIR", value);
  }
}

function setSettings(dir: string, settings: Record<string, unknown>): void {
  setPaiDir(dir);
  writeFile(join(dir, "settings.json"), JSON.stringify(settings));
}

function setNotificationConfig(
  dir: string,
  ntfy: Record<string, unknown> = {},
  extra: Record<string, unknown> = {},
): void {
  setSettings(dir, {
    notifications: {
      ntfy: { enabled: true, topic: "test-topic", server: "ntfy.example.com", ...ntfy },
      ...extra,
    },
  });
}

function writeSettingsRaw(dir: string, content: string): void {
  setPaiDir(dir);
  writeFile(join(dir, "settings.json"), content);
}

function mockFetchCapturingHeaders(
  capturedRef: { headers: Record<string, string> },
): void {
  globalThis.fetch = mock(async (_url: string | URL | Request, init?: RequestInit) => {
    capturedRef.headers = init?.headers as unknown as Record<string, string>;
    return new Response("ok", { status: 200 });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  tempDir = createTempDir();
  savedPaiDir = env.getEnv("PAI_DIR");
  savedFetch = globalThis.fetch;
});

afterEach(() => {
  setPaiDir(savedPaiDir);
  globalThis.fetch = savedFetch;
  removeFile(SESSION_START_FILE);
});

// ─── getNotificationConfig ───────────────────────────────────────────────────

describe("getNotificationConfig", () => {
  it("returns default config when no settings.json exists", () => {
    setPaiDir(join(tempDir, "nonexistent"));
    const config = getNotificationConfig();
    expect(config.ntfy.enabled).toBe(false);
    expect(config.ntfy.topic).toBe("");
    expect(config.ntfy.server).toBe("ntfy.sh");
    expect(config.thresholds.longTaskMinutes).toBe(5);
  });

  it("returns default config when settings.json has no notifications key", () => {
    setSettings(tempDir, { someOtherKey: true });
    const config = getNotificationConfig();
    expect(config.ntfy.enabled).toBe(false);
    expect(config.ntfy.topic).toBe("");
  });

  it("merges ntfy config from settings.json", () => {
    setNotificationConfig(tempDir, { enabled: true, topic: "my-topic", server: "custom.ntfy.sh" });
    const config = getNotificationConfig();
    expect(config.ntfy.enabled).toBe(true);
    expect(config.ntfy.topic).toBe("my-topic");
    expect(config.ntfy.server).toBe("custom.ntfy.sh");
  });

  it("merges threshold config from settings.json", () => {
    setSettings(tempDir, {
      notifications: {
        ntfy: { enabled: false, topic: "", server: "ntfy.sh" },
        thresholds: { longTaskMinutes: 15 },
      },
    });
    const config = getNotificationConfig();
    expect(config.thresholds.longTaskMinutes).toBe(15);
  });

  it("merges routing config from settings.json", () => {
    setSettings(tempDir, {
      notifications: {
        ntfy: { enabled: false, topic: "", server: "ntfy.sh" },
        routing: { taskComplete: ["ntfy"] },
      },
    });
    const config = getNotificationConfig();
    expect(config.routing.taskComplete).toEqual(["ntfy"]);
    // Non-overridden routes keep defaults
    expect(config.routing.error).toEqual(["ntfy"]);
  });

  it("expands environment variables in settings content", () => {
    const marker = "env-expanded-topic-" + Date.now();
    const envKey = "TEST_NTFY_TOPIC_" + Date.now();
    env.setEnv(envKey, marker);
    writeSettingsRaw(
      tempDir,
      JSON.stringify({
        notifications: {
          ntfy: { enabled: true, topic: "${" + envKey + "}", server: "ntfy.sh" },
        },
      }),
    );
    const config = getNotificationConfig();
    expect(config.ntfy.topic).toBe(marker);
    env.deleteEnv(envKey);
  });

  it("expands undefined env vars to empty string", () => {
    writeSettingsRaw(
      tempDir,
      JSON.stringify({
        notifications: {
          ntfy: { enabled: true, topic: "${DEFINITELY_NOT_SET_VAR_XYZ}", server: "ntfy.sh" },
        },
      }),
    );
    const config = getNotificationConfig();
    expect(config.ntfy.topic).toBe("");
  });

  it("returns default config when settings.json is invalid JSON", () => {
    writeSettingsRaw(tempDir, "not valid json {{{");
    const config = getNotificationConfig();
    expect(config.ntfy.enabled).toBe(false);
  });
});

// ─── Session Timing ──────────────────────────────────────────────────────────

describe("recordSessionStart", () => {
  it("writes a timestamp file", () => {
    recordSessionStart();
    expect(fileExists(SESSION_START_FILE)).toBe(true);
    const contentResult = readFile(SESSION_START_FILE);
    expect(contentResult.ok).toBe(true);
    if (contentResult.ok) {
      const timestamp = parseInt(contentResult.value, 10);
      expect(timestamp).toBeGreaterThan(0);
      // Should be recent (within last 5 seconds)
      expect(Date.now() - timestamp).toBeLessThan(5000);
    }
  });

  it("overwrites existing timestamp file", () => {
    writeFile(SESSION_START_FILE, "1000");
    recordSessionStart();
    const contentResult = readFile(SESSION_START_FILE);
    expect(contentResult.ok).toBe(true);
    if (contentResult.ok) {
      const timestamp = parseInt(contentResult.value, 10);
      expect(timestamp).toBeGreaterThan(1000);
    }
  });
});

describe("getSessionDurationMinutes", () => {
  it("returns 0 when no start file exists", () => {
    removeFile(SESSION_START_FILE);
    const duration = getSessionDurationMinutes();
    expect(duration).toBe(0);
  });

  it("returns correct duration in minutes", () => {
    // Write a timestamp 10 minutes ago
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    writeFile(SESSION_START_FILE, tenMinutesAgo.toString());
    const duration = getSessionDurationMinutes();
    // Allow 1 second tolerance
    expect(duration).toBeGreaterThanOrEqual(9.99);
    expect(duration).toBeLessThanOrEqual(10.1);
  });

  it("returns a small positive number for a recent start", () => {
    writeFile(SESSION_START_FILE, Date.now().toString());
    const duration = getSessionDurationMinutes();
    expect(duration).toBeGreaterThanOrEqual(0);
    expect(duration).toBeLessThan(0.1); // Less than 6 seconds
  });
});

describe("isLongRunningTask", () => {
  it("returns false for short tasks", () => {
    writeFile(SESSION_START_FILE, Date.now().toString());
    setPaiDir(join(tempDir, "nonexistent"));
    const result = isLongRunningTask();
    expect(result).toBe(false);
  });

  it("returns true when session exceeds threshold", () => {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    writeFile(SESSION_START_FILE, tenMinutesAgo.toString());
    setPaiDir(join(tempDir, "nonexistent"));
    const result = isLongRunningTask();
    expect(result).toBe(true);
  });

  it("respects custom threshold from config", () => {
    const threeMinutesAgo = Date.now() - 3 * 60 * 1000;
    writeFile(SESSION_START_FILE, threeMinutesAgo.toString());
    setSettings(tempDir, {
      notifications: {
        ntfy: { enabled: false, topic: "", server: "ntfy.sh" },
        thresholds: { longTaskMinutes: 2 },
      },
    });
    const result = isLongRunningTask();
    expect(result).toBe(true);
  });
});

// ─── sendPush ────────────────────────────────────────────────────────────────

describe("sendPush", () => {
  it("returns false when ntfy is disabled", async () => {
    setSettings(tempDir, {
      notifications: {
        ntfy: { enabled: false, topic: "test", server: "ntfy.sh" },
      },
    });
    const result = await sendPush("test message");
    expect(result).toBe(false);
  });

  it("returns false when no topic is configured", async () => {
    setSettings(tempDir, {
      notifications: {
        ntfy: { enabled: true, topic: "", server: "ntfy.sh" },
      },
    });
    const result = await sendPush("test message");
    expect(result).toBe(false);
  });

  it("returns false with default config (disabled)", async () => {
    setPaiDir(join(tempDir, "nonexistent"));
    const result = await sendPush("test message");
    expect(result).toBe(false);
  });

  it("sends correct POST request to ntfy server", async () => {
    setNotificationConfig(tempDir);
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = url.toString();
      capturedInit = init;
      return new Response("ok", { status: 200 });
    }) as unknown as typeof fetch;

    const result = await sendPush("Hello world");
    expect(result).toBe(true);
    expect(capturedUrl).toBe("https://ntfy.example.com/test-topic");
    expect(capturedInit?.method).toBe("POST");
    expect(capturedInit?.body).toBe("Hello world");
    const headers = capturedInit?.headers as unknown as Record<string, string>;
    expect(headers["Content-Type"]).toBe("text/plain");
  });

  it("includes title header when provided", async () => {
    setNotificationConfig(tempDir);
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await sendPush("msg", { title: "My Title" });
    expect(captured.headers["Title"]).toBe("My Title");
  });

  it("maps priority to numeric value", async () => {
    setNotificationConfig(tempDir);
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await sendPush("msg", { priority: "high" });
    expect(captured.headers["Priority"]).toBe("4");
  });

  it("maps all priority levels correctly", async () => {
    const priorityMap: Array<[string, string]> = [
      ["min", "1"],
      ["low", "2"],
      ["default", "3"],
      ["high", "4"],
      ["urgent", "5"],
    ];

    for (const [priority, expected] of priorityMap) {
      setNotificationConfig(tempDir);
      const captured = { headers: {} as Record<string, string> };
      mockFetchCapturingHeaders(captured);

      await sendPush("msg", {
        priority: priority as unknown as "min" | "low" | "default" | "high" | "urgent",
      });
      expect(captured.headers["Priority"]).toBe(expected);
    }
  });

  it("includes tags header when provided", async () => {
    setNotificationConfig(tempDir);
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await sendPush("msg", { tags: ["warning", "fire"] });
    expect(captured.headers["Tags"]).toBe("warning,fire");
  });

  it("includes click header when provided", async () => {
    setNotificationConfig(tempDir);
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await sendPush("msg", { click: "https://example.com" });
    expect(captured.headers["Click"]).toBe("https://example.com");
  });

  it("includes actions header when provided", async () => {
    setNotificationConfig(tempDir);
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await sendPush("msg", {
      actions: [
        { action: "view", label: "Open", url: "https://example.com" },
        { action: "http", label: "API", url: "https://api.example.com" },
      ],
    });
    expect(captured.headers["Actions"]).toBe(
      "view, Open, https://example.com; http, API, https://api.example.com",
    );
  });

  it("returns false when fetch throws an error", async () => {
    setNotificationConfig(tempDir);

    globalThis.fetch = mock(async () => {
      throw new Error("Network error");
    }) as unknown as typeof fetch;

    const result = await sendPush("msg");
    expect(result).toBe(false);
  });

  it("returns false when server returns non-ok status", async () => {
    setNotificationConfig(tempDir);

    globalThis.fetch = mock(async () => {
      return new Response("error", { status: 500 });
    }) as unknown as typeof fetch;

    const result = await sendPush("msg");
    expect(result).toBe(false);
  });

  it("does not include optional headers when not provided", async () => {
    setNotificationConfig(tempDir);
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await sendPush("msg");
    expect(captured.headers["Title"]).toBeUndefined();
    expect(captured.headers["Priority"]).toBeUndefined();
    expect(captured.headers["Tags"]).toBeUndefined();
    expect(captured.headers["Click"]).toBeUndefined();
    expect(captured.headers["Actions"]).toBeUndefined();
  });
});

// ─── notify ──────────────────────────────────────────────────────────────────

describe("notify", () => {
  it("sends push when event is routed to ntfy", async () => {
    setNotificationConfig(tempDir, {}, { routing: { error: ["ntfy"] } });
    let fetchCalled = false;

    globalThis.fetch = mock(async () => {
      fetchCalled = true;
      return new Response("ok", { status: 200 });
    }) as unknown as typeof fetch;

    await notify("error", "Something went wrong");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchCalled).toBe(true);
  });

  it("does not send push when event has no routing channels", async () => {
    setNotificationConfig(tempDir, {}, { routing: { taskComplete: [] } });
    let fetchCalled = false;

    globalThis.fetch = mock(async () => {
      fetchCalled = true;
      return new Response("ok", { status: 200 });
    }) as unknown as typeof fetch;

    await notify("taskComplete", "Done");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchCalled).toBe(false);
  });

  it("uses default title for event when no title provided", async () => {
    setNotificationConfig(tempDir, {}, { routing: { error: ["ntfy"] } });
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await notify("error", "Something broke");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(captured.headers["Title"]).toBe("TestDA - Error");
  });

  it("uses default priority for event when no priority provided", async () => {
    setNotificationConfig(tempDir, {}, { routing: { security: ["ntfy"] } });
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await notify("security", "Alert!");
    await new Promise((resolve) => setTimeout(resolve, 50));
    // security default priority is 'urgent' which maps to '5'
    expect(captured.headers["Priority"]).toBe("5");
  });

  it("uses default tags for event when no tags provided", async () => {
    setNotificationConfig(tempDir, {}, { routing: { backgroundAgent: ["ntfy"] } });
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await notify("backgroundAgent", "Agent done");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(captured.headers["Tags"]).toBe("robot,white_check_mark");
  });

  it("uses custom options when provided, overriding defaults", async () => {
    setNotificationConfig(tempDir, {}, { routing: { error: ["ntfy"] } });
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await notify("error", "Custom error", {
      title: "Custom Title",
      priority: "min",
      tags: ["custom"],
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(captured.headers["Title"]).toBe("Custom Title");
    expect(captured.headers["Priority"]).toBe("1");
    expect(captured.headers["Tags"]).toBe("custom");
  });
});

// ─── notifyTaskComplete ──────────────────────────────────────────────────────

describe("notifyTaskComplete", () => {
  it("uses taskComplete event for short tasks", async () => {
    writeFile(SESSION_START_FILE, Date.now().toString());
    setNotificationConfig(tempDir, {}, { routing: { taskComplete: ["ntfy"] } });
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await notifyTaskComplete("Task done");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(captured.headers["Title"]).toBe("TestDA");
    expect(captured.headers["Tags"]).toBe("white_check_mark");
  });

  it("uses longTask event for long-running tasks", async () => {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    writeFile(SESSION_START_FILE, tenMinutesAgo.toString());
    setNotificationConfig(tempDir, {}, { routing: { longTask: ["ntfy"] } });
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await notifyTaskComplete("Long task done");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(captured.headers["Title"]).toBe("TestDA - Task Complete");
    expect(captured.headers["Tags"]).toBe("hourglass,white_check_mark");
  });
});

// ─── notifyBackgroundAgent ───────────────────────────────────────────────────

describe("notifyBackgroundAgent", () => {
  it("includes agent type in title", async () => {
    setNotificationConfig(tempDir, {}, { routing: { backgroundAgent: ["ntfy"] } });
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await notifyBackgroundAgent("Research", "Research complete");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(captured.headers["Title"]).toBe("Research Agent Complete");
  });

  it("includes robot and check mark tags", async () => {
    setNotificationConfig(tempDir, {}, { routing: { backgroundAgent: ["ntfy"] } });
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await notifyBackgroundAgent("Code", "Done");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(captured.headers["Tags"]).toBe("robot,white_check_mark");
  });

  it("allows custom options to override defaults", async () => {
    setNotificationConfig(tempDir, {}, { routing: { backgroundAgent: ["ntfy"] } });
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await notifyBackgroundAgent("Test", "Done", { priority: "urgent" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(captured.headers["Priority"]).toBe("5");
  });
});

// ─── notifyError ─────────────────────────────────────────────────────────────

describe("notifyError", () => {
  it("uses high priority by default", async () => {
    setNotificationConfig(tempDir, {}, { routing: { error: ["ntfy"] } });
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await notifyError("Something went wrong");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(captured.headers["Priority"]).toBe("4");
  });

  it("uses warning and x tags by default", async () => {
    setNotificationConfig(tempDir, {}, { routing: { error: ["ntfy"] } });
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await notifyError("Error occurred");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(captured.headers["Tags"]).toBe("warning,x");
  });

  it("uses error default title from identity", async () => {
    setNotificationConfig(tempDir, {}, { routing: { error: ["ntfy"] } });
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await notifyError("Crash!");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(captured.headers["Title"]).toBe("TestDA - Error");
  });

  it("allows overriding priority", async () => {
    setNotificationConfig(tempDir, {}, { routing: { error: ["ntfy"] } });
    const captured = { headers: {} as Record<string, string> };
    mockFetchCapturingHeaders(captured);

    await notifyError("Minor issue", { priority: "low" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(captured.headers["Priority"]).toBe("2");
  });
});
