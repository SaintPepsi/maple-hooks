import { Effect } from "effect";
import { git, hasStagedChange } from "@hooks/core/effect/git";
import { runHook } from "@hooks/core/effect/run";
import { getPaiDir } from "@hooks/lib/paths";
import { WATCHED, commitMessage, matchWatched } from "./logic";

const CLAUDE_DIR = getPaiDir();

runHook("PostToolUse", (input) =>
  Effect.gen(function* () {
    const rel = matchWatched(input.tool_input.file_path, WATCHED, CLAUDE_DIR);
    if (!rel) return; // not an identity file → silent no-op
    yield* git(["add", "--", rel]);
    if (yield* hasStagedChange(rel)) {
      yield* git(["commit", "-q", "-m", commitMessage(rel), "--", rel]);
    }
  }),
);
