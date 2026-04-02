/**
 * Stdin Adapter — Single implementation replacing 6 divergent stdin readers.
 *
 * Uses Bun.stdin.stream() with race-based timeout. Returns Result.
 */

import { type ResultError, stdinReadFailed, stdinTimeout } from "../error";
import { err, ok, type Result } from "../result";

const MAX_CHUNKS = 10_000;

export async function readStdin(timeoutMs: number = 200): Promise<Result<string, ResultError>> {
  try {
    const reader = Bun.stdin.stream().getReader();
    let raw = "";

    const decoder = new TextDecoder();
    const readLoop = (async () => {
      for (let i = 0; i < MAX_CHUNKS; i++) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
      }
    })();

    await Promise.race([readLoop, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);

    if (!raw.trim()) {
      return err(stdinTimeout(timeoutMs));
    }

    return ok(raw);
  } catch (e) {
    return err(stdinReadFailed(e));
  }
}
