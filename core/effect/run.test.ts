import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { buildPipeline } from "./run";

const SAMPLE = JSON.stringify({
  session_id: "s",
  transcript_path: "/t",
  cwd: "/c",
  hook_event_name: "PostToolUse",
  tool_name: "Edit",
  tool_input: { file_path: "/x/CLAUDE.md" },
});

describe("buildPipeline", () => {
  it("passes decoded input to the program", async () => {
    let seen: unknown;
    await Effect.runPromise(
      buildPipeline("PostToolUse", SAMPLE, (input) =>
        Effect.sync(() => {
          seen = input.tool_input.file_path;
        }),
      ),
    );
    expect(seen).toBe("/x/CLAUDE.md");
  });

  it("never rejects on bad json (fail-open)", async () => {
    const exit = await Effect.runPromise(
      buildPipeline("PostToolUse", "not json", () => Effect.void).pipe(Effect.either),
    );
    expect(exit._tag).toBe("Right"); // resolved, not failed
  });

  it("never rejects when the program throws a defect (fail-open)", async () => {
    const exit = await Effect.runPromise(
      buildPipeline("PostToolUse", SAMPLE, () =>
        Effect.sync(() => {
          throw new Error("boom");
        }),
      ).pipe(Effect.either),
    );
    expect(exit._tag).toBe("Right"); // defect swallowed, not rejected
  });
});
