interface Deps {
  readFile: (path: string) => string | null;
  stderr: (msg: string) => void;
  signal: unknown;
}
interface Input {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id: string;
}
declare function getFilePath(input: Input): string | null;
declare function getWriteContent(input: Input): string | null;
declare function getEditParts(input: Input): { oldStr: string; newStr: string } | null;
declare function applyEdit(content: string, oldStr: string, newStr: string): string;
declare function isSvelteFile(path: string): boolean;
declare function extractSvelteScript(content: string): string | null;
declare function findAllViolations(content: string, path: string, opts?: unknown): unknown[];
declare function logSignal(signal: unknown, file: string, payload: object): void;
declare function formatBlockMessage(violations: unknown[], path: string): string;

const ok = <T>(v: T) => ({ ok: true as const, value: v });

export function execute(input: Input, deps: Deps) {
  const filePath = getFilePath(input)!;

  let contentToCheck: string | null = null;

  if (input.tool_name === "Write") {
    contentToCheck = getWriteContent(input);
  } else if (input.tool_name === "Edit") {
    const editParts = getEditParts(input);
    if (!editParts) {
      return ok({ continue: true });
    }

    const currentFile = deps.readFile(filePath);
    if (currentFile !== null) {
      contentToCheck = applyEdit(currentFile, editParts.oldStr, editParts.newStr);
    } else {
      contentToCheck = editParts.newStr;
    }
  }

  if (!contentToCheck) {
    return ok({ continue: true });
  }

  if (isSvelteFile(filePath)) {
    const scriptContent = extractSvelteScript(contentToCheck);
    if (!scriptContent) {
      return ok({ continue: true });
    }
    contentToCheck = scriptContent;
  }

  const violations = findAllViolations(contentToCheck, filePath);

  if (violations.length === 0) {
    deps.stderr(`[CodingStandardsEnforcer] ${filePath}: clean`);
    return ok({ continue: true });
  }

  logSignal(deps.signal, "coding-standards-violations.jsonl", {
    session_id: input.session_id,
    file: filePath,
    violation_count: violations.length,
  });

  const message = formatBlockMessage(violations, filePath);
  deps.stderr(message);

  return ok({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: message,
    },
  });
}
