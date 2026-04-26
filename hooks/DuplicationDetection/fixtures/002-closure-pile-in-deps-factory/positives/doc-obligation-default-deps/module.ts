import { join } from "node:path";
import {
  fileExists as fsFileExists,
  readJson,
  removeFile,
  writeFileAtomic,
} from "@hooks/core/adapters/fs";

interface DocObligationDeps {
  stateDir: string;
  fileExists: (path: string) => boolean;
  readPending: (path: string) => string[];
  writePending: (path: string, files: string[]) => void;
  removeFlag: (path: string) => void;
  readBlockCount: (path: string) => number;
  writeBlockCount: (path: string, count: number) => void;
  writeReview: (path: string, content: string) => void;
  stderr: (msg: string) => void;
}

const MAX_PENDING_FILES = 100;

function getStateDir(baseDir: string): string {
  return join(baseDir, "MEMORY", "STATE", "doc-obligation");
}

function defaultStderr(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

const FIXTURE_BASE_DIR = "/tmp/fixture-base";

export const defaultDeps: DocObligationDeps = {
  stateDir: getStateDir(FIXTURE_BASE_DIR),
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
