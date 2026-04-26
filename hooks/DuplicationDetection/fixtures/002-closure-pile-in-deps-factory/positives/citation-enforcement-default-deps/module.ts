import { join } from "node:path";
import { fileExists as fsFileExists, readFile, writeFile } from "@hooks/core/adapters/fs";

interface CitationEnforcementDeps {
  stateDir: string;
  fileExists: (path: string) => boolean;
  writeFlag: (path: string) => void;
  readReminded: (path: string) => string[];
  writeReminded: (path: string, files: string[]) => void;
  stderr: (msg: string) => void;
}

const FIXTURE_BASE_DIR = "/tmp/fixture-base";

function getStateDir(baseDir: string): string {
  return join(baseDir, "MEMORY", "STATE", "citation");
}

function defaultStderr(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

export const defaultDeps: CitationEnforcementDeps = {
  stateDir: getStateDir(FIXTURE_BASE_DIR),
  fileExists: (path: string) => fsFileExists(path),
  writeFlag: (path: string) => {
    writeFile(path, new Date().toISOString());
  },
  readReminded: (path: string) => {
    const result = readFile(path);
    if (!result.ok) return [];
    const parsed = JSON.parse(result.value);
    return Array.isArray(parsed) ? parsed : [];
  },
  writeReminded: (path: string, files: string[]) => {
    writeFile(path, JSON.stringify(files));
  },
  stderr: defaultStderr,
};
