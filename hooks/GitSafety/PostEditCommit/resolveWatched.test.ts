import { describe, expect, it } from "bun:test";
import { resolveWatched } from "./resolveWatched";

describe("resolveWatched", () => {
  it("returns a non-empty config list as-is", () => {
    expect(resolveWatched({ files: ["a"] })).toEqual(["a"]);
  });
  it("returns [] for an empty config list", () => {
    expect(resolveWatched({ files: [] })).toEqual([]);
  });
  it("returns [] when files is undefined (no in-code default)", () => {
    expect(resolveWatched({})).toEqual([]);
  });
});
