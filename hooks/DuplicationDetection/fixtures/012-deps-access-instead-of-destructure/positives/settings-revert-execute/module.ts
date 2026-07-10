interface ToolHookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id: string;
}
interface SettingsRevertDeps {
  homedir: () => string;
  fileExists: (path: string) => boolean;
  readFile: (path: string) => { ok: boolean; value?: string };
  writeFile: (path: string, content: string) => { ok: boolean };
  removeFile: (path: string) => { ok: boolean };
  appendFile: (path: string, content: string) => void;
  ensureDir: (path: string) => { ok: boolean };
  readDir: (path: string) => { ok: boolean; value?: string[] };
  baseDir: string;
  runHardening: (cmd: string) => void;
  stderr: (msg: string) => void;
}

declare function getCommand(input: ToolHookInput): string;
declare function isAllowedCommand(cmd: string): boolean;
declare function cleanupSnapshots(sessionId: string, deps: SettingsRevertDeps): void;
declare function compareAndRevert(
  sessionId: string,
  home: string,
  deps: SettingsRevertDeps,
): string[];
declare function logSettingsAudit(record: object, deps: SettingsRevertDeps): void;

const REVERT_CONTEXT = "Unauthorized settings change detected and reverted.";
const ok = <T>(v: T) => ({ ok: true as const, value: v });

export function execute(input: ToolHookInput, deps: SettingsRevertDeps) {
  const home = deps.homedir();
  const command = getCommand(input).slice(0, 500);

  if (isAllowedCommand(command)) {
    cleanupSnapshots(input.session_id, deps);
    deps.stderr(`[SettingsRevert] Allowed command: ${command.slice(0, 80)}`);
    return ok({});
  }

  const reverted = compareAndRevert(input.session_id, home, deps);

  const action = reverted.length > 0 ? ("reverted" as const) : ("unchanged" as const);
  logSettingsAudit(
    {
      ts: new Date().toISOString(),
      session_id: input.session_id,
      tool: "Bash",
      target: reverted.length > 0 ? reverted.join(", ") : "settings.json",
      action,
      command,
    },
    deps,
  );

  if (reverted.length > 0) {
    deps.runHardening(command);
  }

  if (reverted.length === 0) {
    return ok({});
  }

  deps.stderr(`[SettingsRevert] Reverted unauthorized changes to: ${reverted.join(", ")}`);

  return ok({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: REVERT_CONTEXT,
    },
  });
}
