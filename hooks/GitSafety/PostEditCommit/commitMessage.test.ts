import { describe, expect, it } from "bun:test";
import { commitMessage } from "./commitMessage";

describe("commitMessage", () => {
  it("names the file", () => {
    expect(commitMessage("souls/maple/STYLE.md")).toBe("identity: edit STYLE.md");
  });
});
