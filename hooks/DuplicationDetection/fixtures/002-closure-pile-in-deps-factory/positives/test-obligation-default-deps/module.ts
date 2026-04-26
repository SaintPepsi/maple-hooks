import { join } from "node:path";
import {
  fileExists as fsFileExists,
  readDir as fsReadDir,
  readFile,
  readJson,
  removeFile,
  writeFile,
} from "@hooks/core/adapters/fs";

interface ObligationDeps {
  stateDir: string;
  fileExists: (path: string) => boolean;
  readDir: (dirPath: string) => string[];
  readFileContent: (filePath: string) => string | null;
  readPending: (path: string) => string[];
  writePending: (path: string, files: string[]) => void;
  removeFlag: (path: string) => void;
  readBlockCount: (path: string) => number;
  writeBlockCount: (path: string, count: number) => void;
  writeReview: (path: string, content: string) => void;
  stderr: (msg: string) => void;
}

const FIXTURE_BASE_DIR = "/tmp/fixture-base";

function getStateDir(baseDir: string): string {
  return join(baseDir, "MEMORY", "STATE", "test-obligation");
}

const stderr = (msg: string) => process.stderr.write(`${msg}\n`);

export const defaultDeps: ObligationDeps = {
  stateDir: getStateDir(FIXTURE_BASE_DIR),
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
    if (!result.ok) {
      if (fsFileExists(path)) {
        stderr(`[TestObligationTracker] corrupt state file, resetting: ${path}`);
      }
      return [];
    }
    return Array.isArray(result.value) ? (result.value as string[]) : [];
  },
  writePending: (path: string, files: string[]) => {
    const result = writeFile(path, JSON.stringify(files));
    if (!result.ok) {
      stderr(`[TestObligationTracker] write failed: ${result.error.message}`);
    }
  },
  removeFlag: (path: string) => {
    const result = removeFile(path);
    if (!result.ok) {
      stderr(`[TestObligationTracker] remove failed: ${result.error.message}`);
    }
  },
  readBlockCount: (path: string) => {
    const result = readFile(path);
    if (!result.ok) return 0;
    const n = parseInt(result.value.trim(), 10);
    return Number.isNaN(n) ? 0 : n;
  },
  writeBlockCount: (path: string, count: number) => {
    const result = writeFile(path, String(count));
    if (!result.ok) {
      stderr(`[TestObligationTracker] write block count failed: ${result.error.message}`);
    }
  },
  writeReview: (path: string, content: string) => {
    const result = writeFile(path, content);
    if (!result.ok) {
      stderr(`[TestObligationTracker] write review failed: ${result.error.message}`);
    }
  },
  stderr,
};
