import { describe, expect, it } from "bun:test";
import { ConfigError, DecodeError, GitError } from "./errors";

describe("tagged errors", () => {
  it("GitError carries command + message and is tagged", () => {
    const e = new GitError({ command: "git add x", message: "boom" });
    expect(e._tag).toBe("GitError");
    expect(e.command).toBe("git add x");
    expect(e.message).toBe("boom");
  });

  it("DecodeError is tagged", () => {
    expect(new DecodeError({ message: "bad json" })._tag).toBe("DecodeError");
  });

  it("ConfigError carries hookName + message and is tagged", () => {
    const e = new ConfigError({ hookName: "x", message: "y" });
    expect(e._tag).toBe("ConfigError");
    expect(e.hookName).toBe("x");
    expect(e.message).toBe("y");
  });
});
