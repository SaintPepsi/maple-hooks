/**
 * Manifest Validator Tests — TDD test suite.
 *
 * Validates that the manifest validator correctly detects:
 * - Valid manifests (no diagnostics)
 * - Error handling for missing/malformed files
 */

import { describe, it, expect } from "bun:test";
import { resolve, dirname } from "path";
import { validate, type ValidatorDeps, type ValidationReport } from "./validator";
import { ok, err, type Result } from "@hooks/core/result";
import { PaiError, ErrorCode } from "@hooks/core/error";
import {
  readFile as adapterReadFile,
  readJson as adapterReadJson,
  fileExists as adapterFileExists,
} from "@hooks/core/adapters/fs";

// ─── Helpers ────────────────────────────────────────────────────────────────

const FIXTURES = resolve(import.meta.dir, "../../test-fixtures/manifests");

function fixtureContract(name: string): string {
  return resolve(FIXTURES, `${name}-contract.ts`);
}

function fixtureManifest(name: string): string {
  return resolve(FIXTURES, `${name}-hook.json`);
}

/** Build real deps that read from disk via adapters (no try-catch). */
function makeDeps(overrides: Partial<ValidatorDeps> = {}): ValidatorDeps {
  return {
    readFile: adapterReadFile,
    readJson: adapterReadJson,
    fileExists: adapterFileExists,
    dirname,
    resolve,
    stderr: () => {},
    ...overrides,
  };
}

function expectOk(result: Result<ValidationReport, PaiError>): ValidationReport {
  if (!result.ok) {
    throw new Error(`Expected ok, got err: ${result.error.message}`);
  }
  return result.value;
}

// ─── Valid Manifest ─────────────────────────────────────────────────────────

describe("validate", () => {
  describe("valid manifest", () => {
    it("passes with no diagnostics when deps match imports", () => {
      const result = validate(
        fixtureContract("valid"),
        fixtureManifest("valid"),
        makeDeps(),
      );

      const report = expectOk(result);
      expect(report.valid).toBe(true);
      expect(report.diagnostics).toHaveLength(0);
      expect(report.hookName).toBe("ValidHook");
    });
  });

  // ─── Error Handling ───────────────────────────────────────────────────

  describe("error handling", () => {
    it("returns err when contract file cannot be read", () => {
      const deps = makeDeps({
        readFile: (path: string) => {
          if (path.endsWith(".ts")) {
            return err(new PaiError(ErrorCode.FileNotFound, `Not found: ${path}`));
          }
          return ok("{}");
        },
      });

      const result = validate("/fake/missing.ts", "/fake/hook.json", deps);
      expect(result.ok).toBe(false);
    });

    it("returns err with JSON_PARSE_FAILED when manifest contains malformed JSON", () => {
      const deps = makeDeps({
        readFile: (path: string) => {
          if (path.endsWith(".ts")) return ok('import { ok } from "@hooks/core/result";');
          return err(new PaiError(ErrorCode.FileNotFound, `Not found: ${path}`));
        },
        readJson: () => err(new PaiError(ErrorCode.JsonParseFailed, "Invalid JSON")),
      });

      const result = validate("/fake/contract.ts", "/fake/hook.json", deps);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.JsonParseFailed);
      }
    });

    it("returns err when manifest file cannot be read", () => {
      const deps = makeDeps({
        readFile: (path: string) => ok('import { ok } from "@hooks/core/result";'),
        readJson: (path: string) => err(new PaiError(ErrorCode.FileNotFound, `Not found: ${path}`)),
      });

      const result = validate("/fake/contract.ts", "/fake/missing.json", deps);
      expect(result.ok).toBe(false);
    });
  });
});
