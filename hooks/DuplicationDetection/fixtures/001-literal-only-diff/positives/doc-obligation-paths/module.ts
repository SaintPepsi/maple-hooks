import { join } from "node:path";

declare function sanitizeSessionId(sessionId: string): string;

export function pendingPath(stateDir: string, sessionId: string): string {
  return join(stateDir, `docs-pending-${sanitizeSessionId(sessionId)}.json`);
}

export function blockCountPath(stateDir: string, sessionId: string): string {
  return join(stateDir, `docs-block-count-${sanitizeSessionId(sessionId)}.txt`);
}
