import { join } from "node:path";
import {
  fileExists as fsFileExists,
  readFile,
  readJson,
  removeFile,
  writeFile,
} from "@hooks/core/adapters/fs";

interface ObligationDeps {
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

interface ObligationConfig {
  name: string;
  stateSubdir: string;
}

export function createDefaultDeps(config: ObligationConfig): ObligationDeps {
  const baseDir = "/tmp/fixture-base";
  const stateDir = join(baseDir, "MEMORY", "STATE", config.stateSubdir);
  const log = (msg: string) => process.stderr.write(`${msg}\n`);

  return {
    stateDir,
    fileExists: (path: string) => fsFileExists(path),
    readPending: (path: string) => {
      const result = readJson<unknown>(path);
      if (!result.ok) {
        if (fsFileExists(path)) {
          log(`[${config.name}] corrupt state file, resetting: ${path}`);
        }
        return [];
      }
      return Array.isArray(result.value) ? (result.value as string[]) : [];
    },
    writePending: (path: string, files: string[]) => {
      const result = writeFile(path, JSON.stringify(files));
      if (!result.ok) log(`[${config.name}] write failed: ${result.error.message}`);
    },
    removeFlag: (path: string) => {
      const result = removeFile(path);
      if (!result.ok) log(`[${config.name}] remove failed: ${result.error.message}`);
    },
    readBlockCount: (path: string) => {
      const result = readFile(path);
      if (!result.ok) return 0;
      const n = parseInt(result.value.trim(), 10);
      return Number.isNaN(n) ? 0 : n;
    },
    writeBlockCount: (path: string, count: number) => {
      const result = writeFile(path, String(count));
      if (!result.ok) log(`[${config.name}] write block count failed: ${result.error.message}`);
    },
    writeReview: (path: string, content: string) => {
      const result = writeFile(path, content);
      if (!result.ok) log(`[${config.name}] write review failed: ${result.error.message}`);
    },
    stderr: log,
  };
}
