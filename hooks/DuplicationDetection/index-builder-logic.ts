/**
 * Index building logic for DuplicationDetection.
 *
 * Scans a directory for .ts files, extracts functions via parser.ts,
 * builds lookup maps, and produces a DuplicationIndex.
 *
 * Used by DuplicationIndexBuilder contract. Separated from shared.ts
 * to keep the checker's import surface minimal.
 */

import type { ParserDeps } from "@hooks/hooks/DuplicationDetection/parser";
import { extractFunctions } from "@hooks/hooks/DuplicationDetection/parser";
import type { DuplicationIndex, IndexEntry } from "@hooks/hooks/DuplicationDetection/shared";

// ─── Deps ───────────────────────────────────────────────────────────────────

export interface IndexBuilderDeps {
  readDir: (path: string) => string[] | null;
  readFile: (path: string) => string | null;
  isDirectory: (path: string) => boolean;
  exists: (path: string) => boolean;
  stat: (path: string) => { mtimeMs: number } | null;
  join: (...parts: string[]) => string;
  resolve: (path: string) => string;
  parserDeps: ParserDeps;
}

// ─── File Scanning ──────────────────────────────────────────────────────────

export function findTsFiles(dir: string, deps: IndexBuilderDeps): string[] {
  const results: string[] = [];
  const absDir = deps.resolve(dir);

  function walk(d: string): void {
    const entries = deps.readDir(d);
    if (!entries) return;
    for (const entry of entries) {
      if (entry === "node_modules" || entry === ".git" || entry === "coverage") continue;
      const full = deps.join(d, entry);
      if (deps.isDirectory(full)) {
        walk(full);
      } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
        results.push(full);
      }
    }
  }

  walk(absDir);
  return results.sort();
}

// ─── Index Building ─────────────────────────────────────────────────────────

function groupByField(
  entries: IndexEntry[],
  keyFn: (e: IndexEntry) => string,
): [string, number[]][] {
  const groups = new Map<string, number[]>();
  for (let i = 0; i < entries.length; i++) {
    const key = keyFn(entries[i]);
    const g = groups.get(key);
    if (g) g.push(i);
    else groups.set(key, [i]);
  }
  return [...groups.entries()];
}

export function buildIndex(directory: string, deps: IndexBuilderDeps): DuplicationIndex {
  const root = deps.resolve(directory);
  const files = findTsFiles(directory, deps);
  const entries: IndexEntry[] = [];

  for (const filePath of files) {
    const content = deps.readFile(filePath);
    if (!content) continue;

    const relPath = filePath.startsWith(root) ? filePath.slice(root.length + 1) : filePath;
    const isTsx = filePath.endsWith(".tsx");
    const functions = extractFunctions(content, isTsx, deps.parserDeps);

    for (const fn of functions) {
      entries.push({
        f: relPath,
        n: fn.name,
        l: fn.line,
        h: fn.bodyHash,
        p: fn.paramSig,
        r: fn.returnType,
        fp: fn.fingerprint,
        s: 0, // body size not needed for checker, keep lightweight
      });
    }
  }

  return {
    version: 1,
    root,
    builtAt: new Date().toISOString(),
    fileCount: files.length,
    functionCount: entries.length,
    entries,
    hashGroups: groupByField(entries, (e) => e.h).filter(([_, idxs]) => idxs.length >= 2),
    nameGroups: groupByField(entries, (e) => e.n).filter(([_, idxs]) => idxs.length >= 2),
    sigGroups: groupByField(entries, (e) => `(${e.p})→${e.r}`).filter(
      ([_, idxs]) => idxs.length >= 3,
    ),
  };
}
