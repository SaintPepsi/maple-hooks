interface ToolHookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id: string;
}
interface Deps {
  fileExists: (path: string) => boolean;
  readFile: (path: string) => { ok: boolean; value?: string; error?: { message: string } };
  readJson: <T>(path: string) => { ok: boolean; value?: T };
  getLanguageProfile: (path: string) => unknown;
  isScorableFile: (path: string) => boolean;
  scoreFile: (
    content: string,
    profile: unknown,
    path: string,
  ) => { score: number; violations: unknown[] };
  formatAdvisory: (result: unknown, path: string) => string | null;
  formatDelta: (baseline: unknown, result: unknown, path: string) => string | null;
  signal: { baseDir: string };
  stderr: (msg: string) => void;
  dedup: {
    halfLifeEdits: number;
    halfLifeMs: number;
    countCrossSessionViolations: (baseDir: string, path: string, sessionId: string) => number;
  };
}

declare function getFilePath(input: ToolHookInput): string | null;
declare function isSvelteFile(path: string): boolean;
declare function extractSvelteScript(content: string): string | null;

const ok = <T>(v: T) => ({ ok: true as const, value: v });

export function execute(input: ToolHookInput, deps: Deps) {
  const filePath = getFilePath(input)!;

  const contentResult = deps.readFile(filePath);
  if (!contentResult.ok) {
    deps.stderr(`[CodeQualityGuard] Could not read ${filePath}, skipping`);
    return ok({ continue: true });
  }

  const profile = deps.getLanguageProfile(filePath);
  if (!profile) {
    return ok({ continue: true });
  }

  let contentToScore = contentResult.value!;
  if (isSvelteFile(filePath)) {
    const scriptContent = extractSvelteScript(contentToScore);
    if (!scriptContent) {
      return ok({ continue: true });
    }
    contentToScore = scriptContent;
  }

  const result = deps.scoreFile(contentToScore, profile, filePath);

  const advisory = deps.formatAdvisory(result, filePath);
  const hasAdvisory = !!advisory;

  if (hasAdvisory) {
    deps.stderr(
      `[CodeQualityGuard] ${filePath}: ${result.score}/10 (${result.violations.length} violations)`,
    );
  } else {
    deps.stderr(`[CodeQualityGuard] ${filePath}: ${result.score}/10 (clean)`);
  }

  if (!hasAdvisory) {
    return ok({ continue: true });
  }

  const crossSessionCount = deps.dedup.countCrossSessionViolations(
    deps.signal.baseDir,
    filePath,
    input.session_id,
  );
  const repeatOffender = crossSessionCount >= 3;

  return ok({
    continue: true,
    extra: { advisory, repeatOffender },
  });
}
