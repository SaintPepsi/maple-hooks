import { join } from "node:path";

export function pendingPath(stateDir: string, sessionId: string): string {
  return join(stateDir, `tests-pending-${sessionId}.json`);
}

export function blockCountPath(stateDir: string, sessionId: string): string {
  return join(stateDir, `tests-block-count-${sessionId}.txt`);
}
