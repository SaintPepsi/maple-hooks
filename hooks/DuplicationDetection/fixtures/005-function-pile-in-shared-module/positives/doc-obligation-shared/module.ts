import { dirname, join } from "node:path";
import {
  fileExists as fsFileExists,
  readDir as fsReadDir,
  readJson,
  removeFile,
  writeFileAtomic,
} from "@hooks/core/adapters/fs";
import type { ResultError } from "@hooks/core/error";
import { isScorableFile } from "@hooks/core/language-profiles";
import type { Result } from "@hooks/core/result";
import { readHookConfig } from "@hooks/lib/hook-config";
import type { ObligationDeps } from "@hooks/lib/obligation-machine";
import { defaultStderr, getPaiDir } from "@hooks/lib/paths";

export function projectHasHook(
  name: string,
  cwd: string = process.cwd(),
  dirExists: (path: string) => boolean = fsFileExists,
  listDir: (path: string) => Result<string[], ResultError> = fsReadDir,
): boolean {
  const hookDir = join(cwd, ".claude", "hooks");
  if (!dirExists(hookDir)) return false;
  const result = listDir(hookDir);
  if (!result.ok) return false;
  return result.value.some((f) => f.startsWith(`${name}.hook.`));
}

export type DocObligationDeps = ObligationDeps;

export interface DocTrackerExcludeDeps {
  getExcludePatterns: () => string[];
}

const TEST_FILE_PATTERNS = [/\.test\.\w+$/, /\.spec\.\w+$/, /__tests__\//];

export function isDocFile(filePath: string): boolean {
  return filePath.endsWith(".md") || filePath.endsWith(".mdx");
}

export function isNonTestCodeFile(filePath: string): boolean {
  if (!isScorableFile(filePath)) return false;
  return !TEST_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

export function isRelatedDoc(docPath: string, codePath: string): boolean {
  const docDir = dirname(docPath);
  const codeDir = dirname(codePath);
  if (docDir === "/" || docDir === "" || codeDir === "/" || codeDir === "") return false;
  return codeDir.startsWith(docDir) || docDir.startsWith(codeDir);
}

export function sanitizeSessionId(sessionId: string): string {
  return sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function pendingPath(stateDir: string, sessionId: string): string {
  return join(stateDir, `docs-pending-${sanitizeSessionId(sessionId)}.json`);
}

export function blockCountPath(stateDir: string, sessionId: string): string {
  return join(stateDir, `docs-block-count-${sanitizeSessionId(sessionId)}.txt`);
}

export const MAX_PENDING_FILES = 100;
export const MAX_BLOCKS = 1;

export function buildBlockLimitReview(pendingFiles: string[], blockCount: number): string {
  const timestamp = new Date().toISOString();
  const fileList = pendingFiles.map((f) => `- ${f}`).join("\n");
  return `# Doc Obligation Review\n\n**Generated:** ${timestamp}\n**Block attempts:** ${blockCount}\n\n${fileList}\n`;
}

const DOC_FILENAMES = ["README.md", "CHANGELOG.md", "ARCHITECTURE.md", "DESIGN.md", "SKILL.md"];

export function findExistingDoc(dir: string, deps: DocObligationDeps): string | null {
  for (const name of DOC_FILENAMES) {
    const docPath = join(dir, name);
    if (deps.fileExists(docPath)) return docPath;
  }
  return null;
}

export function buildDocSuggestions(pending: string[], deps: DocObligationDeps): string {
  const dirMap = new Map<string, string[]>();
  for (const file of pending) {
    const dir = dirname(file);
    if (!dirMap.has(dir)) dirMap.set(dir, []);
    dirMap.get(dir)!.push(file);
  }

  const lines: string[] = [];
  for (const [dir] of dirMap) {
    const existingDoc = findExistingDoc(dir, deps);
    if (existingDoc) {
      lines.push(`Update \`${existingDoc}\``);
    } else {
      lines.push(`Create or update documentation in \`${dir}/\``);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function readDocExcludePatterns(settingsPath?: string): string[] {
  const cfg = readHookConfig<{ excludePatterns?: string[] }>(
    "docObligation",
    undefined,
    settingsPath,
  );
  return Array.isArray(cfg?.excludePatterns) ? cfg.excludePatterns : [];
}

export function matchesDocExcludePattern(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => new Bun.Glob(pattern).match(filePath));
}

function getStateDir(baseDir: string): string {
  return join(baseDir, "MEMORY", "STATE", "doc-obligation");
}

export const defaultDocTrackerExcludeDeps: DocTrackerExcludeDeps = {
  getExcludePatterns: () => readDocExcludePatterns(),
};

export const defaultDeps: DocObligationDeps = {
  stateDir: getStateDir(getPaiDir()),
  fileExists: (path: string) => fsFileExists(path),
  readPending: (path: string) => {
    const result = readJson<unknown>(path);
    if (!result.ok) return [];
    const parsed = result.value;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  },
  writePending: (path: string, files: string[]) => {
    const capped = files.slice(-MAX_PENDING_FILES);
    writeFileAtomic(path, JSON.stringify(capped));
  },
  removeFlag: (path: string) => {
    removeFile(path);
  },
  readBlockCount: (path: string) => {
    const result = readJson<unknown>(path);
    if (!result.ok) return 0;
    const n = parseInt(String(result.value).trim(), 10);
    return Number.isNaN(n) ? 0 : n;
  },
  writeBlockCount: (path: string, count: number) => {
    writeFileAtomic(path, String(count));
  },
  writeReview: (path: string, content: string) => {
    writeFileAtomic(path, content);
  },
  stderr: defaultStderr,
};
