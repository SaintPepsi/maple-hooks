import { describe, it, expect } from "bun:test";
import { join } from "path";

const HOOK_PATH = join(import.meta.dir, "AgentList.hook.ts");

async function runHook(input: Record<string, unknown>): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", HOOK_PATH], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  const writer = proc.stdin!;
  writer.write(JSON.stringify(input));
  writer.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), stderr, exitCode };
}

describe("AgentList hook shell", () => {
  it("exits 0 for SessionStart event", async () => {
    const result = await runHook({ session_id: "test" });
    expect(result.exitCode).toBe(0);
  });

  it("produces string output (context or empty for silent)", async () => {
    const result = await runHook({ session_id: "test" });
    expect(result.exitCode).toBe(0);
    expect(typeof result.stdout).toBe("string");
  });
});
