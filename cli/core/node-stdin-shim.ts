/**
 * Node Stdin Shim — Node-compatible replacement for Bun.stdin.stream().
 *
 * Used in --compiled (Node target) builds to replace the Bun.stdin adapter
 * with process.stdin (Node built-in). Returns Result, matching the
 * readStdin signature from core/adapters/stdin.ts
 * (see /Users/hogers/.claude/maple-hooks/.claude/worktrees/agent-ac7f9ecc/core/adapters/stdin.ts).
 *
 * This file is injected into the bundle at compile time, replacing
 * core/adapters/stdin.ts so that compiled Node output has no Bun.* globals.
 */

import type { ResultError } from "@hooks/core/error";
import { stdinReadFailed, stdinTimeout } from "@hooks/core/error";
import type { Result } from "@hooks/core/result";
import { err, ok } from "@hooks/core/result";

/**
 * Read stdin using Node's process.stdin with a race-based timeout.
 *
 * Pure Result pipeline — errors are returned, never thrown.
 * Mirrors the Bun.stdin.stream() approach in core/adapters/stdin.ts.
 */
export async function readStdin(timeoutMs: number = 200): Promise<Result<string, ResultError>> {
  const chunks: Buffer[] = [];
  let streamError: unknown = null;

  const readLoop = new Promise<void>((resolve) => {
    process.stdin.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    process.stdin.on("end", resolve);
    process.stdin.on("error", (e) => {
      streamError = e;
      resolve();
    });
  });

  await Promise.race([readLoop, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);

  if (streamError !== null) {
    return err(stdinReadFailed(streamError));
  }

  const raw = Buffer.concat(chunks).toString("utf-8");

  if (!raw.trim()) {
    return err(stdinTimeout(timeoutMs));
  }

  return ok(raw);
}
