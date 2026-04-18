import { describe, expect, test } from "bun:test";
import { parseTranscriptEntry } from "./transcript-schema";

describe("transcript-schema", () => {
  describe("parseTranscriptEntry", () => {
    test("accepts valid user entry with string content", () => {
      const input = { type: "user", message: { content: "hello" } };
      const result = parseTranscriptEntry(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe("user");
        expect(result.value.message?.content).toBe("hello");
      }
    });

    test("accepts valid assistant entry with array content", () => {
      const input = {
        type: "assistant",
        message: { content: [{ type: "text", text: "response" }] },
      };
      const result = parseTranscriptEntry(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe("assistant");
      }
    });

    test("accepts entry without message", () => {
      const input = { type: "user" };
      const result = parseTranscriptEntry(input);
      expect(result.ok).toBe(true);
    });

    test("rejects entry with empty message (content is required)", () => {
      const input = { type: "assistant", message: {} };
      const result = parseTranscriptEntry(input);
      expect(result.ok).toBe(false);
    });

    test("rejects entry with invalid type", () => {
      const input = { type: "system", message: { content: "hello" } };
      const result = parseTranscriptEntry(input);
      expect(result.ok).toBe(false);
    });

    test("rejects entry without type", () => {
      const input = { message: { content: "hello" } };
      const result = parseTranscriptEntry(input);
      expect(result.ok).toBe(false);
    });

    test("rejects non-object input", () => {
      expect(parseTranscriptEntry("string").ok).toBe(false);
      expect(parseTranscriptEntry(123).ok).toBe(false);
      expect(parseTranscriptEntry(null).ok).toBe(false);
      expect(parseTranscriptEntry(undefined).ok).toBe(false);
    });

    test("rejects entry with invalid message content type", () => {
      const input = { type: "user", message: { content: 123 } };
      const result = parseTranscriptEntry(input);
      expect(result.ok).toBe(false);
    });

    test("rejects entry with invalid content array items", () => {
      const input = {
        type: "user",
        message: { content: [{ type: 123 }] },
      };
      const result = parseTranscriptEntry(input);
      expect(result.ok).toBe(false);
    });
  });
});
