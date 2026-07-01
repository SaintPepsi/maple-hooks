import { describe, expect, it } from "bun:test";
import { toRepoRel } from "./toRepoRel";

const DIR = "/home/u/.claude";

describe("toRepoRel", () => {
  it("passes through a repo-relative path", () => {
    expect(toRepoRel("souls/maple/SOUL.md", DIR)).toBe("souls/maple/SOUL.md");
  });
  it("expands `~` to the home dir so `~/.claude/...` resolves under claudeDir", () => {
    expect(toRepoRel("~/.claude/souls/maple/STYLE.md", DIR)).toBe("souls/maple/STYLE.md");
    expect(toRepoRel("~/.claude/CLAUDE.md", DIR)).toBe("CLAUDE.md");
  });
  it("returns null for a `~/` path outside claudeDir (e.g. ~/Documents)", () => {
    expect(toRepoRel("~/Documents/notes.md", DIR)).toBeNull();
  });
  it("strips claudeDir from an absolute path under it", () => {
    expect(toRepoRel(`${DIR}/CLAUDE.md`, DIR)).toBe("CLAUDE.md");
  });
  it("returns null for an absolute path outside claudeDir", () => {
    expect(toRepoRel("/etc/passwd", DIR)).toBeNull();
  });
  it("returns null for anything resolving to the repo root (guards `git add -- \"\"`)", () => {
    expect(toRepoRel("", DIR)).toBeNull();
    expect(toRepoRel("~/", DIR)).toBeNull();
    expect(toRepoRel(`${DIR}/`, DIR)).toBeNull();
    expect(toRepoRel(DIR, DIR)).toBeNull();
  });
});
