import { describe, expect, it } from "bun:test";
import { WATCHED, commitMessage, matchWatched } from "./logic";

const DIR = "/home/u/.claude";

describe("matchWatched", () => {
  it("returns the rel path for a watched file (absolute)", () => {
    expect(matchWatched(`${DIR}/souls/maple/STYLE.md`, WATCHED, DIR)).toBe("souls/maple/STYLE.md");
  });
  it("expands a leading ~", () => {
    expect(matchWatched("~/CLAUDE.md", WATCHED, DIR)).toBe("CLAUDE.md");
  });
  it("returns null for an unwatched file", () => {
    expect(matchWatched(`${DIR}/notes.md`, WATCHED, DIR)).toBeNull();
  });
  it("returns null for non-string (unknown) input", () => {
    expect(matchWatched(42, WATCHED, DIR)).toBeNull();
    expect(matchWatched(undefined, WATCHED, DIR)).toBeNull();
  });
});

describe("commitMessage", () => {
  it("names the file", () => {
    expect(commitMessage("souls/maple/STYLE.md")).toBe("identity: edit STYLE.md");
  });
});
