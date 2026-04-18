// Pattern 49: Read-Modify-Write
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Read current state -> apply modification -> write back

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface PackageJson {
  name: string;
  version: string;
  dependencies: Record<string, string>;
}

interface ConfigFile {
  settings: Record<string, unknown>;
  lastModified: string;
}

interface StateFile {
  cursor: number;
  processed: string[];
  errors: string[];
}

// File system abstraction - injected dependency pattern
interface FileSystem {
  read(path: string): string;
  write(path: string, content: string): void;
}

const fs: FileSystem = {
  read: (_path) => "{}",
  write: (_path, _content) => {},
};

// ============================================================================
// VARIANT A: Update package.json version
// ============================================================================

function bumpVersion(filePath: string, newVersion: string): void {
  const content = fs.read(filePath);
  const pkg = JSON.parse(content) as PackageJson;
  pkg.version = newVersion;
  fs.write(filePath, JSON.stringify(pkg, null, 2));
}

// ============================================================================
// VARIANT B: Update config setting
// ============================================================================

function updateSetting(filePath: string, key: string, value: unknown): void {
  const content = fs.read(filePath);
  const config = JSON.parse(content) as ConfigFile;
  config.settings[key] = value;
  fs.write(filePath, JSON.stringify(config, null, 2));
}

// ============================================================================
// VARIANT C: Update state file cursor
// ============================================================================

function updateCursor(filePath: string, newCursor: number): void {
  const content = fs.read(filePath);
  const state = JSON.parse(content) as StateFile;
  state.cursor = newCursor;
  fs.write(filePath, JSON.stringify(state, null, 2));
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  bumpVersion,
  updateSetting,
  updateCursor,
  PackageJson,
  ConfigFile,
  StateFile,
};
