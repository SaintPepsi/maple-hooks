import { basename, dirname, join } from "node:path";
import {
  fileExists as fsFileExists,
  readDir as fsReadDir,
  readFile,
  readJson,
  removeFile,
  writeFile,
} from "@hooks/core/adapters/fs";
import { isScorableFile } from "@hooks/core/language-profiles";
import { readHookConfig } from "@hooks/lib/hook-config";
import type { ObligationDeps } from "@hooks/lib/obligation-machine";
import { defaultStderr, getPaiDir } from "@hooks/lib/paths";

export interface ImportScanDeps {
  readDir: (dirPath: string) => string[];
  readFileContent: (filePath: string) => string | null;
}

export type TestObligationDeps = ObligationDeps & ImportScanDeps;

export interface TestTrackerExcludeDeps {
  getExcludePatterns: () => string[];
}

const TEST_FILE_PATTERNS = [/\.test\.\w+$/, /\.spec\.\w+$/, /__tests__\//];
const TEST_COMMANDS = [/\bbun\s+test\b/, /\bnpm\s+test\b/];

export function isNonTestCodeFile(filePath: string): boolean {
  if (!isScorableFile(filePath)) return false;
  return !TEST_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

export function isTestCommand(command: string): boolean {
  return TEST_COMMANDS.some((pattern) => pattern.test(command));
}

export function extractTestedSourceFiles(command: string): string[] | null {
  const testFilePattern = /\S+\.(?:test|spec)\.\w+/g;
  const matches = command.match(testFilePattern);
  if (!matches || matches.length === 0) return null;
  return matches.map((testFile) => testFile.replace(/\.(?:test|spec)\./, "."));
}

export function pendingMatchesSource(pendingFile: string, sourceFile: string): boolean {
  return pendingFile.endsWith(sourceFile) || pendingFile.endsWith(`/${sourceFile}`);
}

export function pendingPath(stateDir: string, sessionId: string): string {
  return join(stateDir, `tests-pending-${sessionId}.json`);
}

export function blockCountPath(stateDir: string, sessionId: string): string {
  return join(stateDir, `tests-block-count-${sessionId}.txt`);
}

export const MAX_BLOCKS = 2;

export function buildBlockLimitReview(
  obligationType: string,
  pendingFiles: string[],
  blockCount: number,
): string {
  const fileList = pendingFiles.map((f) => `- ${f}`).join("\n");
  return `# ${obligationType} Obligation Review\n\n**Block attempts:** ${blockCount}\n\n${fileList}\n`;
}

export function deriveTestPaths(sourcePath: string): string[] {
  const dotIndex = sourcePath.lastIndexOf(".");
  if (dotIndex === -1) return [];
  const base = sourcePath.slice(0, dotIndex);
  const ext = sourcePath.slice(dotIndex);
  return [`${base}.test${ext}`, `${base}.spec${ext}`];
}

export function hasTestFile(sourcePath: string, fileExists: (path: string) => boolean): boolean {
  return deriveTestPaths(sourcePath).some(fileExists);
}

export function findTestFile(
  sourcePath: string,
  fileExists: (path: string) => boolean,
): string | null {
  return deriveTestPaths(sourcePath).find(fileExists) ?? null;
}

export function findImportingTestFile(sourcePath: string, deps: ImportScanDeps): string | null {
  const stem = basename(sourcePath).replace(/\.[^.]+$/, "");
  const sourceDir = dirname(sourcePath);
  const entries = deps.readDir(sourceDir);
  for (const entry of entries) {
    if (!/\.(?:test|spec)\.\w+$/.test(entry)) continue;
    const fullPath = join(sourceDir, entry);
    const content = deps.readFileContent(fullPath);
    if (content !== null && new RegExp(`from\\s+['"][^'"]*${stem}['"]`).test(content)) {
      return fullPath;
    }
  }
  return null;
}

export function readTestExcludePatterns(settingsPath?: string): string[] {
  const cfg = readHookConfig<{ excludePatterns?: string[] }>(
    "testObligation",
    undefined,
    settingsPath,
  );
  return Array.isArray(cfg?.excludePatterns) ? cfg.excludePatterns : [];
}

export function matchesExcludePattern(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => new Bun.Glob(pattern).match(filePath));
}

export function toRelativePath(absPath: string, cwd: string): string {
  const cwdWithSlash = cwd.endsWith("/") ? cwd : `${cwd}/`;
  return absPath.startsWith(cwdWithSlash) ? absPath.slice(cwdWithSlash.length) : absPath;
}

export function formatAsTree(files: string[], cwd: string): string {
  return files.map((f) => toRelativePath(f, cwd)).join("\n");
}

function getStateDir(baseDir: string): string {
  return join(baseDir, "MEMORY", "STATE", "test-obligation");
}

const stderr = (msg: string) => defaultStderr(msg);

export const defaultDeps: TestObligationDeps = {
  stateDir: getStateDir(getPaiDir()),
  fileExists: (path: string) => fsFileExists(path),
  readDir: (dirPath: string) => {
    const result = fsReadDir(dirPath);
    return result.ok ? result.value : [];
  },
  readFileContent: (filePath: string) => {
    const result = readFile(filePath);
    return result.ok ? result.value : null;
  },
  readPending: (path: string) => {
    const result = readJson<unknown>(path);
    if (!result.ok) return [];
    return Array.isArray(result.value) ? (result.value as string[]) : [];
  },
  writePending: (path: string, files: string[]) => {
    writeFile(path, JSON.stringify(files));
  },
  removeFlag: (path: string) => {
    removeFile(path);
  },
  readBlockCount: (path: string) => {
    const result = readFile(path);
    if (!result.ok) return 0;
    const n = parseInt(result.value.trim(), 10);
    return Number.isNaN(n) ? 0 : n;
  },
  writeBlockCount: (path: string, count: number) => {
    writeFile(path, String(count));
  },
  writeReview: (path: string, content: string) => {
    writeFile(path, content);
  },
  stderr,
};
