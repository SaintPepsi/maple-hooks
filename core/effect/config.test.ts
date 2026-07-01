import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { Effect, Schema } from "effect";
import { readConfig } from "./config";

const schema = Schema.Struct({ files: Schema.optional(Schema.Array(Schema.String)) });

/** Write a settings.json into a fresh temp dir; return its path. */
function writeSettings(contents: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "readconfig-"));
  const path = join(dir, "settings.json");
  writeFileSync(path, JSON.stringify(contents));
  return path;
}

describe("readConfig", () => {
  it("yields the validated config when the hook is configured", async () => {
    const path = writeSettings({ hookConfig: { postEditCommit: { files: ["X.md"] } } });
    const value = await Effect.runPromise(readConfig("postEditCommit", schema, undefined, path));
    expect(value).toEqual({ files: ["X.md"] });
  });

  it("fails with a ConfigError when the hook key is missing", async () => {
    const path = writeSettings({ hookConfig: { somethingElse: {} } });
    const either = await Effect.runPromise(
      Effect.either(readConfig("postEditCommit", schema, undefined, path)),
    );
    expect(either._tag).toBe("Left");
    if (either._tag === "Left") {
      expect(either.left._tag).toBe("ConfigError");
    }
  });
});
