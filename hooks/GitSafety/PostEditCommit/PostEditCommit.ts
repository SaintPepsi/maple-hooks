import { Effect, Schema } from "effect";
import { readConfig } from "@hooks/core/effect/config";
import { git, hasStagedChange } from "@hooks/core/effect/git";
import { runHook } from "@hooks/core/effect/run";
import { getPaiDir } from "@hooks/lib/paths";
import { commitMessage, matchWatched, resolveWatched } from "./logic";

const CLAUDE_DIR = getPaiDir();
const ConfigSchema = Schema.Struct({ files: Schema.optional(Schema.Array(Schema.String)) });

runHook("PostToolUse", (input) =>
  Effect.gen(function* () {
    // Config is its own program; on missing/invalid config, fall back to the default.
    const cfg = yield* readConfig("postEditCommit", ConfigSchema).pipe(
      Effect.orElseSucceed(() => ({ files: undefined }) as { files?: readonly string[] }),
    );
    const rel = matchWatched(input.tool_input.file_path, resolveWatched(cfg.files), CLAUDE_DIR);
    if (!rel) return; // not an identity file → silent no-op
    yield* git(["add", "--", rel]);
    if (yield* hasStagedChange(rel)) {
      yield* git(["commit", "-q", "-m", commitMessage(rel), "--", rel]);
    }
  }),
);
