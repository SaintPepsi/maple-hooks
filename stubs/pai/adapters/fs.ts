import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export { join };

export function readFileSafe(path: string): string | null {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

export function pathExists(path: string): boolean {
  return existsSync(path);
}

export function writeFileSafe(path: string, content: string): boolean {
  try {
    writeFileSync(path, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function ensureDirSafe(dirPath: string): boolean {
  try {
    mkdirSync(dirPath, { recursive: true });
    return true;
  } catch {
    return false;
  }
}
