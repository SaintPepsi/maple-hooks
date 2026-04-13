import { describe, expect, it } from "bun:test";
import { OPUS_MODEL, SONNET_MODEL } from "@hooks/core/constants";

describe("core/constants", () => {
  describe("OPUS_MODEL", () => {
    it("is a non-empty string", () => {
      expect(typeof OPUS_MODEL).toBe("string");
      expect(OPUS_MODEL.length).toBeGreaterThan(0);
    });

    it("contains 'opus'", () => {
      expect(OPUS_MODEL).toContain("opus");
    });

    it("matches expected value", () => {
      expect(OPUS_MODEL).toBe("claude-opus-4-5-20251101");
    });
  });

  describe("SONNET_MODEL", () => {
    it("is a non-empty string", () => {
      expect(typeof SONNET_MODEL).toBe("string");
      expect(SONNET_MODEL.length).toBeGreaterThan(0);
    });

    it("contains 'sonnet'", () => {
      expect(SONNET_MODEL).toContain("sonnet");
    });

    it("matches expected value", () => {
      expect(SONNET_MODEL).toBe("claude-sonnet-4-5-20251101");
    });
  });
});
