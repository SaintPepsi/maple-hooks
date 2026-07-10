interface ToolHookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id: string;
}
interface Violation {
  category: string;
  line: number;
  content: string;
}
interface ViolationCheckOptions {
  exportDefaultExclusions?: RegExp[];
}
interface CodingStandardsEnforcerConfig {
  exportDefault?: { allowPatterns?: string[] };
  skipFiles?: string[];
}
interface Deps {
  readFile: (path: string) => string | null;
  readConfig: () => CodingStandardsEnforcerConfig | null;
  signal: unknown;
  stderr: (msg: string) => void;
  baseDir: string;
}

declare function loadHookConfig<T extends object>(name: string, defaults: T, dir: string): T;
declare function pickNarrative(name: string, count: number, dir: string): string;

const DEFAULT_CONFIG: CodingStandardsEnforcerConfig = {
  exportDefault: { allowPatterns: [] },
  skipFiles: [],
};

const getConfig = (): CodingStandardsEnforcerConfig =>
  loadHookConfig("codingStandards", DEFAULT_CONFIG, __dirname);

function getWriteContent(input: ToolHookInput): string | null {
  if (typeof input.tool_input !== "object" || input.tool_input === null) return null;
  if (input.tool_name === "Write") return (input.tool_input.content as string) ?? null;
  return null;
}

function getEditParts(input: ToolHookInput): { oldStr: string; newStr: string } | null {
  if (typeof input.tool_input !== "object" || input.tool_input === null) return null;
  if (input.tool_name !== "Edit") return null;
  const oldStr = input.tool_input.old_string as string | undefined;
  const newStr = input.tool_input.new_string as string | undefined;
  if (!oldStr || !newStr) return null;
  return { oldStr, newStr };
}

function applyEdit(fileContent: string, oldStr: string, newStr: string): string {
  return fileContent.replace(oldStr, newStr);
}

function formatBlockMessage(violations: Violation[], filePath: string): string {
  const grouped: Record<string, Violation[]> = {};
  for (const v of violations) {
    (grouped[v.category] ??= []).push(v);
  }
  const opener = pickNarrative("CodingStandardsEnforcer", violations.length, __dirname);
  return `${opener}\n${violations.length} violations in ${filePath}`;
}

function getExportDefaultExclusions(deps: Deps): ViolationCheckOptions | undefined {
  const config = deps.readConfig();
  const patterns = config?.exportDefault?.allowPatterns;
  if (!patterns?.length) return undefined;
  return { exportDefaultExclusions: patterns.map((p) => new RegExp(p)) };
}

function isSkippedByConfig(filePath: string): boolean {
  const config = getConfig();
  const patterns = config.skipFiles;
  if (!patterns?.length) return false;
  const basename = filePath.split("/").pop() ?? "";
  return patterns.some((p) => basename === p || new RegExp(p).test(filePath));
}

export const CodingStandardsEnforcer = {
  name: "CodingStandardsEnforcer",
  helpers: {
    getWriteContent,
    getEditParts,
    applyEdit,
    formatBlockMessage,
    getExportDefaultExclusions,
    isSkippedByConfig,
  },
};
