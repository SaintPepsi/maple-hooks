import { Effect, Schema } from "effect";
import { readStdin } from "@hooks/core/adapters/stdin";
import { PostToolUseInput } from "@hooks/core/types/hook-input-schema";

const SCHEMAS = {
  PostToolUse: PostToolUseInput,
} as const;

export type HookEvent = keyof typeof SCHEMAS;
export type InputOf<E extends HookEvent> = Schema.Schema.Type<(typeof SCHEMAS)[E]>;

/** The decode+run pipeline, fail-open. Exposed for testing with a literal `raw`. */
export function buildPipeline<E extends HookEvent, Err>(
  event: E,
  raw: string,
  program: (input: InputOf<E>) => Effect.Effect<void, Err>,
): Effect.Effect<void, never> {
  // Cast the union-indexed schema to a concrete (R = never) schema: the registry
  // only ever holds context-free Schema.Structs, but TS can't prove that through
  // the generic index, so decode's requirements channel would otherwise widen.
  const schema = SCHEMAS[event] as unknown as Schema.Schema<InputOf<E>>;
  return Schema.decodeUnknown(Schema.parseJson(schema))(raw).pipe(
    Effect.flatMap((input) => program(input)),
    Effect.catchAll(() => Effect.void),
  );
}

/**
 * Entry point for an Effect hook. Reads stdin, decodes to the typed input for
 * `event`, runs `program`. NEVER throws or blocks: any failure resolves to a
 * silent `{}` on stdout, exit 0.
 */
export function runHook<E extends HookEvent, Err>(
  event: E,
  program: (input: InputOf<E>) => Effect.Effect<void, Err>,
): void {
  const main = Effect.gen(function* () {
    const raw = yield* Effect.promise(() => readStdin());
    if (!raw.ok) return;
    yield* buildPipeline(event, raw.value, program);
  });

  void Effect.runPromise(main).then(() => {
    process.stdout.write("{}");
    process.exit(0);
  });
}
