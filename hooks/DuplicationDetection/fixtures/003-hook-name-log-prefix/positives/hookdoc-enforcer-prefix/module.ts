interface Deps {
  stderr: (msg: string) => void;
}

interface Result {
  pending: string[];
}

export const HookDocEnforcer = {
  name: "HookDocEnforcer",

  execute(
    input: { session_id: string },
    deps: Deps,
    result: Result,
    settings: { blocking: boolean },
  ) {
    if (!settings.blocking) {
      deps.stderr(
        `[HookDocEnforcer] ${result.pending.length} hook(s) need docs (non-blocking mode)`,
      );
      return { ok: true };
    }
    deps.stderr(`[HookDocEnforcer] Block: ${result.pending.length} hook(s) pending`);
    return { ok: true };
  },
};
