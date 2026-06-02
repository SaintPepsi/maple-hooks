/**
 * Tests for lib/identity.ts — Central Identity Loader
 *
 * Verifies the Deps injection pattern works correctly.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { fileNotFound } from "@hooks/core/error";
import {
  clearCache,
  getDAName,
  getDefaultIdentity,
  getDefaultPrincipal,
  getIdentity,
  getPrincipal,
  getPrincipalName,
  type IdentityDeps,
  type Settings,
} from "@hooks/lib/identity";

// Global cache cleanup — ensures no cache leaks between describe blocks
// regardless of test execution order (bun 1.3+ may interleave describe blocks)
beforeEach(() => clearCache());
afterEach(() => clearCache());

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeDeps(settings: Settings): IdentityDeps {
  return {
    settingsPath: "/tmp/test-settings.json",
    readJson: () => ({ ok: true as const, value: settings }),
    fileExists: () => true,
  };
}

function emptyDeps(): IdentityDeps {
  return {
    settingsPath: "/tmp/test-settings.json",
    readJson: () => ({ ok: true as const, value: {} }),
    fileExists: () => true,
  };
}

function missingFileDeps(): IdentityDeps {
  return {
    settingsPath: "/tmp/missing-settings.json",
    readJson: () => ({
      ok: false as const,
      error: fileNotFound("/tmp/missing-settings.json"),
    }),
    fileExists: () => false,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("getIdentity", () => {
  it("returns defaults when settings file is missing", () => {
    const identity = getIdentity(missingFileDeps());
    expect(identity.name).toBe("PAI");
    expect(identity.fullName).toBe("Personal AI");
    expect(identity.displayName).toBe("PAI");
    expect(identity.color).toBe("#3B82F6");
  });

  it("returns defaults when settings has no daidentity", () => {
    const identity = getIdentity(emptyDeps());
    expect(identity.name).toBe("PAI");
    expect(identity.fullName).toBe("Personal AI");
  });

  it("returns defaults when settings file exists but cannot be parsed", () => {
    const corruptDeps: IdentityDeps = {
      settingsPath: "/tmp/corrupt-settings.json",
      readJson: () => ({
        ok: false as const,
        error: fileNotFound("/tmp/corrupt-settings.json"),
      }),
      fileExists: () => true,
    };
    const identity = getIdentity(corruptDeps);
    expect(identity.name).toBe("PAI");
    expect(identity.fullName).toBe("Personal AI");
  });

  it("reads basic identity fields", () => {
    const deps = makeDeps({
      daidentity: {
        name: "Maple",
        fullName: "Maple the AI",
        displayName: "Mapes",
        color: "#FF0000",
      },
    });
    const identity = getIdentity(deps);
    expect(identity.name).toBe("Maple");
    expect(identity.fullName).toBe("Maple the AI");
    expect(identity.displayName).toBe("Mapes");
    expect(identity.color).toBe("#FF0000");
  });

  it("falls back fullName and displayName to name", () => {
    const deps = makeDeps({ daidentity: { name: "Ren" } });
    const identity = getIdentity(deps);
    expect(identity.fullName).toBe("Ren");
    expect(identity.displayName).toBe("Ren");
  });

  it("caches settings across calls with same deps", () => {
    let callCount = 0;
    const deps: IdentityDeps = {
      settingsPath: "/tmp/test.json",
      readJson: () => {
        callCount++;
        return { ok: true as const, value: { daidentity: { name: "Cached" } } };
      },
      fileExists: () => true,
    };

    getIdentity(deps);
    getIdentity(deps);
    expect(callCount).toBe(1);
  });

  it("respects clearCache", () => {
    let callCount = 0;
    const deps: IdentityDeps = {
      settingsPath: "/tmp/test.json",
      readJson: () => {
        callCount++;
        return { ok: true as const, value: { daidentity: { name: "Fresh" } } };
      },
      fileExists: () => true,
    };

    getIdentity(deps);
    clearCache();
    getIdentity(deps);
    expect(callCount).toBe(2);
  });
});

describe("getPrincipal", () => {
  it("returns defaults when no principal in settings", () => {
    const principal = getPrincipal(emptyDeps());
    expect(principal.name).toBe("User");
    expect(principal.pronunciation).toBe("");
    expect(principal.timezone).toBe("UTC");
  });

  it("reads principal fields from settings", () => {
    const deps = makeDeps({
      principal: {
        name: "Ian",
        pronunciation: "ee-an",
        timezone: "Australia/Melbourne",
      },
    });
    const principal = getPrincipal(deps);
    expect(principal.name).toBe("Ian");
    expect(principal.pronunciation).toBe("ee-an");
    expect(principal.timezone).toBe("Australia/Melbourne");
  });
});

describe("convenience functions", () => {
  it("getDAName returns the DA name", () => {
    const deps = makeDeps({ daidentity: { name: "TestDA" } });
    expect(getDAName(deps)).toBe("TestDA");
  });

  it("getPrincipalName returns the principal name", () => {
    const deps = makeDeps({ principal: { name: "TestUser" } });
    expect(getPrincipalName(deps)).toBe("TestUser");
  });
});

describe("static defaults", () => {
  it("getDefaultIdentity returns a copy of default identity", () => {
    const a = getDefaultIdentity();
    const b = getDefaultIdentity();
    expect(a).toEqual(b);
    expect(a).not.toBe(b); // different object references
    expect(a.name).toBe("PAI");
  });

  it("getDefaultPrincipal returns a copy of default principal", () => {
    const a = getDefaultPrincipal();
    const b = getDefaultPrincipal();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(a.name).toBe("User");
  });
});
