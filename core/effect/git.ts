import { Effect } from "effect";
import { execSyncSafe } from "@hooks/core/adapters/process";
import { getPaiDir } from "@hooks/lib/paths";
import { GitError } from "./errors";

/** Shell-quote an argument only when it contains something outside a safe set. */
function quote(arg: string): string {
  return /^[A-Za-z0-9_./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, "'\\''")}'`;
}

/** Run a git command in `cwd`. Fails with GitError on non-zero exit / spawn error. */
export const gitIn = (cwd: string, args: string[]): Effect.Effect<string, GitError> =>
  Effect.suspend(() => {
    const command = `git ${args.map(quote).join(" ")}`;
    const result = execSyncSafe(command, { cwd });
    return result.ok
      ? Effect.succeed(result.value)
      : Effect.fail(new GitError({ command, message: result.error.message }));
  });

/**
 * True if `rel` has staged changes in `cwd`. `git diff --cached --quiet` exits 0
 * when there is no staged change (→ false) and 1 when there is (→ GitError → true).
 */
export const hasStagedChangeIn = (cwd: string, rel: string): Effect.Effect<boolean, never> =>
  gitIn(cwd, ["diff", "--cached", "--quiet", "--", rel]).pipe(
    Effect.as(false),
    Effect.catchTag("GitError", () => Effect.succeed(true)),
  );

const CLAUDE_DIR = getPaiDir();

/** git in the ~/.claude repo. */
export const git = (args: string[]): Effect.Effect<string, GitError> => gitIn(CLAUDE_DIR, args);

/** hasStagedChange in the ~/.claude repo. */
export const hasStagedChange = (rel: string): Effect.Effect<boolean, never> =>
  hasStagedChangeIn(CLAUDE_DIR, rel);
