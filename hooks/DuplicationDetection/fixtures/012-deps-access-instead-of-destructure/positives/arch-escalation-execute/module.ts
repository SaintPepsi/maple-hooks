interface ToolHookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id: string;
}
interface ArchEscalationDeps {
  fileExists: (path: string) => boolean;
  readJson: <T>(path: string) => { ok: boolean; value?: T };
  writeJson: (path: string, data: unknown) => { ok: boolean };
  ensureDir: (path: string) => { ok: boolean };
  now: () => number;
  stderr: (msg: string) => void;
}

declare function loadState(
  sessionId: string,
  deps: ArchEscalationDeps,
): {
  criteria: Record<string, { inProgressCount: number; lastSeenAt: number }>;
};
declare function saveState(state: unknown, deps: ArchEscalationDeps): void;
declare function buildWarningMessage(criterionId: string, count: number): string;

const STOP_THRESHOLD = 3;
const WARN_THRESHOLD = 2;
const ok = <T>(v: T) => ({ ok: true as const, value: v });

export function execute(input: ToolHookInput, deps: ArchEscalationDeps) {
  const { tool_input, session_id } = input;
  const taskId = tool_input.taskId;
  const status = tool_input.status;

  if (typeof taskId !== "string" || taskId.trim() === "") {
    return ok({ continue: true });
  }
  if (status !== "in_progress") {
    return ok({ continue: true });
  }

  const criterionId = taskId.trim();
  const state = loadState(session_id, deps);

  if (!state.criteria[criterionId]) {
    state.criteria[criterionId] = { inProgressCount: 0, lastSeenAt: 0 };
  }

  const record = state.criteria[criterionId];
  record.inProgressCount += 1;
  record.lastSeenAt = deps.now();

  saveState(state, deps);

  const failedAttempts = record.inProgressCount - 1;

  deps.stderr(
    `[ArchEscalation] ${criterionId}: inProgressCount=${record.inProgressCount}, failedAttempts=${failedAttempts}`,
  );

  if (failedAttempts >= STOP_THRESHOLD) {
    const message = buildWarningMessage(criterionId, failedAttempts);
    deps.stderr(`[ArchEscalation] STOP escalation for ${criterionId} (${failedAttempts} failures)`);
    return ok({
      continue: true,
      hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: message },
    });
  }

  if (failedAttempts >= WARN_THRESHOLD) {
    const message = buildWarningMessage(criterionId, failedAttempts);
    deps.stderr(
      `[ArchEscalation] Warning escalation for ${criterionId} (${failedAttempts} failures)`,
    );
    return ok({
      continue: true,
      hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: message },
    });
  }

  return ok({ continue: true });
}
