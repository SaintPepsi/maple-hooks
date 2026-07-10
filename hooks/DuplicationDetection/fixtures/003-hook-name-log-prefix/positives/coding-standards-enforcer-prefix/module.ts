interface Deps {
  stderr: (msg: string) => void;
}

export const CodingStandardsEnforcer = {
  name: "CodingStandardsEnforcer",

  execute(filePath: string, violations: unknown[], deps: Deps) {
    if (violations.length === 0) {
      deps.stderr(`[CodingStandardsEnforcer] ${filePath}: clean`);
      return { ok: true };
    }
    deps.stderr(`[CodingStandardsEnforcer] ${filePath}: ${violations.length} violations`);
    return { ok: true };
  },
};
