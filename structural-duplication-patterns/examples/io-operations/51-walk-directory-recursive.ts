// Pattern 51: Walk-Directory-Recursive
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Read directory entries -> filter/process -> recurse into subdirs -> collect results

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface FileInfo {
  path: string;
  name: string;
  isDirectory: boolean;
  size: number;
}

interface SourceFile {
  path: string;
  language: string;
  lines: number;
}

interface ImageFile {
  path: string;
  format: string;
  width: number;
  height: number;
}

function readdirSync(_path: string): string[] {
  return [];
}

function statSync(_path: string): { isDirectory: () => boolean; size: number } {
  return { isDirectory: () => false, size: 0 };
}

function join(..._parts: string[]): string {
  return _parts.join("/");
}

function getExtension(path: string): string {
  return path.split(".").pop() || "";
}

const SOURCE_EXTENSIONS = ["ts", "js", "py", "go"];
const IMAGE_EXTENSIONS = ["png", "jpg", "gif", "webp"];

// ============================================================================
// VARIANT A: Find all files recursively
// ============================================================================

function findAllFiles(dirPath: string): FileInfo[] {
  const results: FileInfo[] = [];
  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findAllFiles(fullPath));
    } else {
      results.push({ path: fullPath, name: entry, isDirectory: false, size: stat.size });
    }
  }
  return results;
}

// ============================================================================
// VARIANT B: Find source files recursively
// ============================================================================

function findSourceFiles(dirPath: string): SourceFile[] {
  const results: SourceFile[] = [];
  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findSourceFiles(fullPath));
    } else {
      const ext = getExtension(entry);
      if (SOURCE_EXTENSIONS.includes(ext)) {
        results.push({ path: fullPath, language: ext, lines: 0 });
      }
    }
  }
  return results;
}

// ============================================================================
// VARIANT C: Find image files recursively
// ============================================================================

function findImageFiles(dirPath: string): ImageFile[] {
  const results: ImageFile[] = [];
  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findImageFiles(fullPath));
    } else {
      const ext = getExtension(entry);
      if (IMAGE_EXTENSIONS.includes(ext)) {
        results.push({ path: fullPath, format: ext, width: 0, height: 0 });
      }
    }
  }
  return results;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  findAllFiles,
  findSourceFiles,
  findImageFiles,
  FileInfo,
  SourceFile,
  ImageFile,
};
