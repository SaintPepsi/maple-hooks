import { Data } from "effect";

/** git invocation failed (non-zero exit or spawn error). */
export class GitError extends Data.TaggedError("GitError")<{
  readonly command: string;
  readonly message: string;
}> {}

/** stdin was unreadable or did not match the expected hook input schema. */
export class DecodeError extends Data.TaggedError("DecodeError")<{
  readonly message: string;
}> {}
