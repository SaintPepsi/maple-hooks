import { join } from "node:path";

export function pendingPath(stateDir: string, prefix: string, sessionId: string): string {
  return join(stateDir, `${prefix}-${sessionId}.json`);
}

export function blockCountPath(stateDir: string, prefix: string, sessionId: string): string {
  return join(stateDir, `${prefix}-${sessionId}.txt`);
}
