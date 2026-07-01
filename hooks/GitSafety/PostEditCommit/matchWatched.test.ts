import { describe, expect, it } from "bun:test";
import { matchWatched } from "./matchWatched";

const DIR = "/home/u/.claude";
const FILES = ["CLAUDE.md", "souls/maple/SOUL.md", "souls/maple/STYLE.md"] as const;

describe("matchWatched", () => {
  it("returns the rel path for a watched file (absolute)", () => {
    expect(matchWatched(`${DIR}/souls/maple/STYLE.md`, FILES, DIR)).toBe("souls/maple/STYLE.md");
  });
  it("expands a leading ~", () => {
    expect(matchWatched("~/CLAUDE.md", FILES, DIR)).toBe("CLAUDE.md");
  });
  it("returns null for an unwatched file", () => {
    expect(matchWatched(`${DIR}/notes.md`, FILES, DIR)).toBeNull();
  });
  it("returns null for non-string (unknown) input", () => {
    expect(matchWatched(42, FILES, DIR)).toBeNull();
    expect(matchWatched(undefined, FILES, DIR)).toBeNull();
  });
});
