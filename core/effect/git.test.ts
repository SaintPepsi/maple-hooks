import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gitIn, hasStagedChangeIn } from "./git";

function tmpRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "effkit-"));
  execSync("git init -q && git config user.email t@t && git config user.name t", { cwd: dir });
  return dir;
}

describe("git effects", () => {
  it("hasStagedChangeIn is false with nothing staged, true after add", async () => {
    const dir = tmpRepo();
    writeFileSync(join(dir, "a.txt"), "hi");

    const before = await Effect.runPromise(hasStagedChangeIn(dir, "a.txt"));
    expect(before).toBe(false);

    await Effect.runPromise(gitIn(dir, ["add", "--", "a.txt"]));
    const after = await Effect.runPromise(hasStagedChangeIn(dir, "a.txt"));
    expect(after).toBe(true);
  });

  it("gitIn commits only the staged file", async () => {
    const dir = tmpRepo();
    writeFileSync(join(dir, "a.txt"), "hi");
    await Effect.runPromise(gitIn(dir, ["add", "--", "a.txt"]));
    await Effect.runPromise(gitIn(dir, ["commit", "-q", "-m", "msg", "--", "a.txt"]));
    const log = execSync("git log --oneline", { cwd: dir, encoding: "utf-8" });
    expect(log).toContain("msg");
  });
});
