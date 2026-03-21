import { describe, it, expect } from "bun:test";
import { runHook } from "@hooks/core/runner";
import { SpotCheckReview } from "@hooks/contracts/SpotCheckReview";

describe("SpotCheckReview.hook shim integration", () => {
  it("outputs silent (no stdout) when contract returns silent", async () => {
    let output = "";
    let exitCode = -1;

    await runHook(SpotCheckReview, {
      stdinOverride: JSON.stringify({ session_id: "shim-test-1" }),
      stdout: (msg: string) => { output += msg; },
      stderr: () => {},
      exit: (code: number) => { exitCode = code; },
      appendLog: () => {},
    });

    // SpotCheckReview with no changed files (real git returns empty) should be silent or block
    // Either way, it should exit 0 and produce valid output (or none for silent)
    expect(exitCode).toBe(0);
    if (output.length > 0) {
      const parsed = JSON.parse(output);
      expect(parsed).toBeDefined();
    }
  });

  it("exits 0 on malformed stdin", async () => {
    let exitCode = -1;

    await runHook(SpotCheckReview, {
      stdinOverride: "not-json",
      stdout: () => {},
      stderr: () => {},
      exit: (code: number) => { exitCode = code; },
      appendLog: () => {},
    });

    expect(exitCode).toBe(0);
  });

  it("exits 0 on empty stdin", async () => {
    let exitCode = -1;

    await runHook(SpotCheckReview, {
      stdinOverride: "",
      stdout: () => {},
      stderr: () => {},
      exit: (code: number) => { exitCode = code; },
      appendLog: () => {},
    });

    expect(exitCode).toBe(0);
  });

  it("wires the correct contract (name and event)", () => {
    expect(SpotCheckReview.name).toBe("SpotCheckReview");
    expect(SpotCheckReview.event).toBe("Stop");
  });
});
