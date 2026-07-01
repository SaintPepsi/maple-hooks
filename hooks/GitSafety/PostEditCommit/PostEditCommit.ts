import { Effect, Schema } from "effect";
import { readConfig } from "@hooks/core/effect/config";
import { git, hasStagedChange } from "@hooks/core/effect/git";
import { runHook } from "@hooks/core/effect/run";
import { getPaiDir } from "@hooks/lib/paths";
import { commitMessage } from "./commitMessage";
import { matchWatched } from "./matchWatched";
import { resolveWatched } from "./resolveWatched";

const CLAUDE_DIR = getPaiDir();
const ConfigSchema = Schema.Struct({ files: Schema.optional(Schema.Array(Schema.String)) });

runHook("PostToolUse", (input) =>
  Effect.gen(function* () {
    const cfg = yield* readConfig("postEditCommit", ConfigSchema).pipe(
      Effect.orElseSucceed(() => ({ files: undefined })),
    );
    const watched = resolveWatched(cfg);
    if (watched.length === 0) {
      // settings.json is the sole source; unconfigured → visible no-op.
      yield* Effect.sync(() =>
        process.stderr.write(
          "[PostEditCommit] hookConfig.postEditCommit.files is unset; watching nothing.\n",
        ),
      );
      return;
    }
    const rel = matchWatched(input.tool_input.file_path, watched, CLAUDE_DIR);
    if (!rel) return; // not a watched file → no-op
    yield* git(["add", "--", rel]);
    if (yield* hasStagedChange(rel)) {
      // --no-verify: these are .md-tracking commits; skip ~/.claude husky entirely.
      yield* git(["commit", "-q", "--no-verify", "-m", commitMessage(rel), "--", rel]);
    }
  }),
);
