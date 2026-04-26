interface SignalLoggerDeps {
  baseDir: string;
  appendFile: (path: string, content: string) => void;
}

export function logSignal(
  deps: SignalLoggerDeps,
  fileName: string,
  payload: Record<string, unknown>,
): void {
  const line = `${JSON.stringify({ ...payload, ts: new Date().toISOString() })}\n`;
  deps.appendFile(`${deps.baseDir}/${fileName}`, line);
}
