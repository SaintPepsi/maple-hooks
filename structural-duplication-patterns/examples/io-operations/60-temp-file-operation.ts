// Pattern 60: Temp-File-Operation
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Create temp file -> perform operation using it -> clean up temp file
// NOTE: Using simpler cleanup pattern per project standards

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface ImageAnalysis {
  width: number;
  height: number;
  format: string;
}

interface VideoAnalysis {
  duration: number;
  codec: string;
  resolution: string;
}

interface ArchiveInfo {
  files: string[];
  totalSize: number;
}

function generateTempPath(prefix: string): string {
  return `/tmp/${prefix}-${Date.now()}.tmp`;
}

function writeTempFile(_path: string, _content: Buffer): void {}
function removeTempFile(_path: string): void {}

function analyzeImageAtPath(_path: string): ImageAnalysis {
  return { width: 0, height: 0, format: "" };
}

function analyzeVideoAtPath(_path: string): VideoAnalysis {
  return { duration: 0, codec: "", resolution: "" };
}

function listArchiveAtPath(_path: string): ArchiveInfo {
  return { files: [], totalSize: 0 };
}

// ============================================================================
// VARIANT A: Analyze image from buffer using temp file
// ============================================================================

function analyzeImageBuffer(imageBuffer: Buffer): ImageAnalysis {
  const tempPath = generateTempPath("img");
  writeTempFile(tempPath, imageBuffer);
  const result = analyzeImageAtPath(tempPath);
  removeTempFile(tempPath);
  return result;
}

// ============================================================================
// VARIANT B: Analyze video from buffer using temp file
// ============================================================================

function analyzeVideoBuffer(videoBuffer: Buffer): VideoAnalysis {
  const tempPath = generateTempPath("vid");
  writeTempFile(tempPath, videoBuffer);
  const result = analyzeVideoAtPath(tempPath);
  removeTempFile(tempPath);
  return result;
}

// ============================================================================
// VARIANT C: List archive from buffer using temp file
// ============================================================================

function listArchiveBuffer(archiveBuffer: Buffer): ArchiveInfo {
  const tempPath = generateTempPath("archive");
  writeTempFile(tempPath, archiveBuffer);
  const result = listArchiveAtPath(tempPath);
  removeTempFile(tempPath);
  return result;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  analyzeImageBuffer,
  analyzeVideoBuffer,
  listArchiveBuffer,
  ImageAnalysis,
  VideoAnalysis,
  ArchiveInfo,
};
