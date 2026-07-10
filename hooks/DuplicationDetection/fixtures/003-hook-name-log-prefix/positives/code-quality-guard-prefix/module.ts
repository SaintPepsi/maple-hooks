interface Deps {
  stderr: (msg: string) => void;
}

interface Score {
  score: number;
  violations: unknown[];
}

export const CodeQualityGuard = {
  name: "CodeQualityGuard",

  execute(filePath: string, result: Score, deps: Deps, hasAdvisory: boolean) {
    if (hasAdvisory) {
      deps.stderr(
        `[CodeQualityGuard] ${filePath}: ${result.score}/10 (${result.violations.length} violations)`,
      );
    } else {
      deps.stderr(`[CodeQualityGuard] ${filePath}: ${result.score}/10 (clean)`);
    }
    return { ok: true };
  },
};
