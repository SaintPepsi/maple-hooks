/**
 * Manifest Validator — Basic hook manifest validation.
 *
 * Dependencies are now auto-discovered from imports at install time
 * (see lib/import-parser.ts), so dep validation is no longer needed.
 * This validator checks that manifests are parseable and contracts exist.
 *
 * Follows DI pattern: ValidatorDeps interface + defaultDeps object.
 * Uses Result pattern from @hooks/core/result — no try-catch in business logic.
 */

import { dirname as nodeDirname, resolve as nodeResolve } from "node:path";
import type { HookManifest } from "@hooks/cli/types/manifest";
import {
  fileExists as adapterFileExists,
  readFile as adapterReadFile,
  readJson as adapterReadJson,
} from "@hooks/core/adapters/fs";
import type { PaiError } from "@hooks/core/error";
import type { Result } from "@hooks/core/result";
import { ok } from "@hooks/core/result";

// ─── Types ──────────────────────────────────────────────────────────────────

export type DiagnosticCode = "MANIFEST_PARSE_ERROR" | "CONTRACT_MISSING";

export interface ValidationDiagnostic {
  code: DiagnosticCode;
  message: string;
  dep: string;
}

export interface ValidationReport {
  hookName: string;
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
}

export interface ValidatorDeps {
  readFile: (path: string) => Result<string, PaiError>;
  readJson: (path: string) => Result<HookManifest, PaiError>;
  fileExists: (path: string) => boolean;
  dirname: (path: string) => string;
  resolve: (...segments: string[]) => string;
  stderr: (msg: string) => void;
}

// ─── Default Deps ───────────────────────────────────────────────────────────

const defaultDeps: ValidatorDeps = {
  readFile: adapterReadFile,
  readJson: adapterReadJson,
  fileExists: adapterFileExists,
  dirname: nodeDirname,
  resolve: nodeResolve,
  stderr: (msg) => process.stderr.write(`${msg}\n`),
};

// ─── Validator ──────────────────────────────────────────────────────────────

export function validate(
  contractPath: string,
  manifestPath: string,
  deps: ValidatorDeps = defaultDeps,
): Result<ValidationReport, PaiError> {
  // Read and parse manifest JSON
  const manifestParseResult = deps.readJson(manifestPath);
  if (!manifestParseResult.ok) return manifestParseResult;
  const manifest = manifestParseResult.value;

  const diagnostics: ValidationDiagnostic[] = [];

  // Verify contract file exists
  if (!deps.fileExists(contractPath)) {
    diagnostics.push({
      code: "CONTRACT_MISSING",
      message: `Contract file not found: ${contractPath}`,
      dep: contractPath,
    });
  }

  return ok({
    hookName: manifest.name,
    valid: diagnostics.length === 0,
    diagnostics,
  });
}
