// Pattern 48: Ensure-Directory-Write
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Extract directory -> ensure it exists -> write file content

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface Report {
  title: string;
  data: unknown[];
  generatedAt: Date;
}

interface Snapshot {
  version: string;
  state: Record<string, unknown>;
  timestamp: number;
}

interface Artifact {
  name: string;
  content: Buffer;
  checksum: string;
}

function dirname(_path: string): string {
  return "/tmp";
}

function mkdirSync(_path: string, _opts: { recursive: boolean }): void {}

function writeFileSync(_path: string, _content: string | Buffer): void {}

// ============================================================================
// VARIANT A: Save report ensuring directory exists
// ============================================================================

function saveReport(filePath: string, report: Report): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(report, null, 2));
}

// ============================================================================
// VARIANT B: Save snapshot ensuring directory exists
// ============================================================================

function saveSnapshot(filePath: string, snapshot: Snapshot): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
}

// ============================================================================
// VARIANT C: Save binary artifact ensuring directory exists
// ============================================================================

function saveArtifact(filePath: string, artifact: Artifact): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, artifact.content);
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  saveReport,
  saveSnapshot,
  saveArtifact,
  Report,
  Snapshot,
  Artifact,
};
