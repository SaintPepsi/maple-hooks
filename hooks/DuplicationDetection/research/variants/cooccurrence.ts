#!/usr/bin/env bun
// Cycle 8: Function Co-occurrence Mining
//
// PROBLEM: All prior detectors analyze individual functions. But duplication often
// manifests as GROUPS of functions that appear together — template tuples.
// {makeDeps, makeInput} co-occur in 26 files. {getFilePath, getStateDir,
// blockCountPath, pendingPath, isNonTestCodeFile, buildBlockLimitReview}
// always appear together in obligation state machine files.
//
// APPROACH: Frequent itemset mining on function name sets per file. Find pairs
// and larger tuples that co-occur across multiple files, then validate with
// structural similarity to filter coincidental co-occurrence from genuine templates.
//
// Usage: bun Tools/pattern-detector/variants/cooccurrence.ts <directory> [--min-support 3] [--max-tuple 6] [--top 25]

import { parseDirectory } from "@tools/pattern-detector/parse";
import { bodySimilarity } from "@tools/pattern-detector/similarity";
import type { ParsedFile, ParsedFunction } from "@tools/pattern-detector/types";

// ─── Frequent Pair Mining ───────────────────────────────────────────────────

interface FunctionTuple {
  names: string[];
  support: number; // number of files containing all names
  files: string[]; // file paths
  avgBodySimilarity: number;
  isTemplate: boolean; // avg body sim > threshold across files
}

function minePairs(
  files: ParsedFile[],
  minSupport: number,
): Map<string, { count: number; files: string[] }> {
  const pairCounts = new Map<string, { count: number; files: string[] }>();

  for (const file of files) {
    const names = [...new Set(file.functions.map((fn) => fn.name))];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const pair = [names[i], names[j]].sort().join("|");
        const existing = pairCounts.get(pair);
        if (existing) {
          existing.count++;
          existing.files.push(file.path);
        } else {
          pairCounts.set(pair, { count: 1, files: [file.path] });
        }
      }
    }
  }

  // Filter by minimum support
  for (const [pair, data] of pairCounts) {
    if (data.count < minSupport) pairCounts.delete(pair);
  }

  return pairCounts;
}

// ─── Tuple Expansion (Apriori-like) ─────────────────────────────────────────
// Expand frequent pairs into larger tuples by finding names that co-occur
// with ALL members of an existing tuple.

function expandTuples(
  files: ParsedFile[],
  frequentPairs: Map<string, { count: number; files: string[] }>,
  minSupport: number,
  maxSize: number,
): FunctionTuple[] {
  // Build file → name set index
  const fileNames = new Map<string, Set<string>>();
  for (const file of files) {
    fileNames.set(file.path, new Set(file.functions.map((fn) => fn.name)));
  }

  // Start with frequent pairs as size-2 tuples
  let currentLevel: Map<string, string[]> = new Map(); // key → files
  for (const [pair, data] of frequentPairs) {
    currentLevel.set(pair, data.files);
  }

  const allTuples: { names: string[]; files: string[] }[] = [];

  // Add pairs
  for (const [pair, files] of currentLevel) {
    allTuples.push({ names: pair.split("|"), files });
  }

  // Expand level by level
  for (let size = 3; size <= maxSize; size++) {
    const nextLevel = new Map<string, string[]>();

    const currentKeys = [...currentLevel.keys()];
    for (let i = 0; i < currentKeys.length; i++) {
      const namesA = currentKeys[i].split("|");
      for (let j = i + 1; j < currentKeys.length; j++) {
        const namesB = currentKeys[j].split("|");

        // Check if they share all but one name (Apriori property)
        const shared = namesA.filter((n) => namesB.includes(n));
        if (shared.length !== size - 2) continue;

        const merged = [...new Set([...namesA, ...namesB])].sort();
        if (merged.length !== size) continue;

        const key = merged.join("|");
        if (nextLevel.has(key)) continue;

        // Count support: files containing ALL names in the tuple
        const supportFiles: string[] = [];
        for (const [filePath, nameSet] of fileNames) {
          if (merged.every((n) => nameSet.has(n))) {
            supportFiles.push(filePath);
          }
        }

        if (supportFiles.length >= minSupport) {
          nextLevel.set(key, supportFiles);
        }
      }
    }

    if (nextLevel.size === 0) break;

    for (const [key, files] of nextLevel) {
      allTuples.push({ names: key.split("|"), files });
    }

    currentLevel = nextLevel;
  }

  return allTuples.map((t) => ({
    names: t.names,
    support: t.files.length,
    files: t.files,
    avgBodySimilarity: 0,
    isTemplate: false,
  }));
}

// ─── Template Validation ────────────────────────────────────────────────────
// For each tuple, compute average body similarity across files to distinguish
// genuine templates from coincidental co-occurrence.

function validateTuples(
  tuples: FunctionTuple[],
  files: ParsedFile[],
  templateThreshold: number,
): FunctionTuple[] {
  // Build lookup: file → name → ParsedFunction
  const fnLookup = new Map<string, Map<string, ParsedFunction>>();
  for (const file of files) {
    const nameMap = new Map<string, ParsedFunction>();
    for (const fn of file.functions) {
      nameMap.set(fn.name, fn);
    }
    fnLookup.set(file.path, nameMap);
  }

  for (const tuple of tuples) {
    if (tuple.files.length < 2) continue;

    // For each function name in the tuple, compute avg pairwise body similarity
    // across the files that contain it
    let totalSim = 0;
    let totalComparisons = 0;

    for (const name of tuple.names) {
      const instances: ParsedFunction[] = [];
      for (const filePath of tuple.files) {
        const nameMap = fnLookup.get(filePath);
        const fn = nameMap?.get(name);
        if (fn) instances.push(fn);
      }

      // Sample pairwise similarity
      const maxPairs = 10;
      let pairCount = 0;
      for (let i = 0; i < instances.length && pairCount < maxPairs; i++) {
        for (let j = i + 1; j < instances.length && pairCount < maxPairs; j++) {
          totalSim += bodySimilarity(instances[i], instances[j]);
          totalComparisons++;
          pairCount++;
        }
      }
    }

    tuple.avgBodySimilarity = totalComparisons > 0 ? totalSim / totalComparisons : 0;
    tuple.isTemplate = tuple.avgBodySimilarity >= templateThreshold;
  }

  return tuples;
}

// ─── Maximal Tuple Filtering ────────────────────────────────────────────────
// Remove tuples that are strict subsets of larger tuples with the same support.

function filterMaximal(tuples: FunctionTuple[]): FunctionTuple[] {
  // Sort by size descending
  const sorted = [...tuples].sort((a, b) => b.names.length - a.names.length);
  const result: FunctionTuple[] = [];

  for (const tuple of sorted) {
    // Check if this tuple is a strict subset of any already-kept tuple with same support
    const isSubset = result.some((larger) => {
      if (larger.support !== tuple.support) return false;
      return tuple.names.every((n) => larger.names.includes(n));
    });

    if (!isSubset) result.push(tuple);
  }

  return result;
}

// ─── Output ─────────────────────────────────────────────────────────────────

function shortenPath(filePath: string): string {
  const home = require("node:os").homedir() as string;
  if (filePath.startsWith(home)) return `~${filePath.slice(home.length)}`;
  return filePath;
}

function formatResults(
  tuples: FunctionTuple[],
  maximalTuples: FunctionTuple[],
  fileCount: number,
  functionCount: number,
  parseTimeMs: number,
  top: number,
): string {
  const lines: string[] = [];

  lines.push("\nFunction Co-occurrence Mining (Cycle 8)");
  lines.push("═".repeat(42));
  lines.push(
    `Scanned: ${fileCount} files, ${functionCount} functions | Parse: ${parseTimeMs.toFixed(0)}ms`,
  );
  lines.push(`Total tuples found: ${tuples.length} | Maximal tuples: ${maximalTuples.length}`);

  // Tuple size distribution
  const sizeDist = new Map<number, number>();
  for (const t of maximalTuples) {
    sizeDist.set(t.names.length, (sizeDist.get(t.names.length) ?? 0) + 1);
  }
  lines.push(`\n--- Tuple Size Distribution ---`);
  for (const [size, count] of [...sizeDist.entries()].sort((a, b) => a[0] - b[0])) {
    lines.push(`  ${size}-tuples: ${count}`);
  }

  // Template tuples (validated by body similarity)
  const templates = maximalTuples.filter((t) => t.isTemplate);
  const nonTemplates = maximalTuples.filter((t) => !t.isTemplate);

  lines.push(`\n--- Validated Templates (body similarity > threshold) ---`);
  lines.push(`Found ${templates.length} template tuple(s)\n`);

  for (const t of templates.slice(0, top)) {
    lines.push(
      `  {${t.names.join(", ")}} — ${t.support} files, ${(t.avgBodySimilarity * 100).toFixed(0)}% avg body sim`,
    );
    for (const f of t.files.slice(0, 5)) {
      lines.push(`    - ${shortenPath(f).replace(/.*maple-hooks\//, "")}`);
    }
    if (t.files.length > 5) {
      lines.push(`    ... and ${t.files.length - 5} more`);
    }
    lines.push("");
  }

  // Non-template co-occurrences (coincidental)
  if (nonTemplates.length > 0) {
    lines.push(`--- Coincidental Co-occurrences (low body similarity) ---`);
    lines.push(`Found ${nonTemplates.length} non-template tuple(s)\n`);
    for (const t of nonTemplates.slice(0, 5)) {
      lines.push(
        `  {${t.names.join(", ")}} — ${t.support} files, ${(t.avgBodySimilarity * 100).toFixed(0)}% avg body sim (not a template)`,
      );
    }
  }

  return lines.join("\n");
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const directory = args.find((a) => !a.startsWith("--"));

if (!directory) {
  process.stderr.write(
    "Usage: bun Tools/pattern-detector/variants/cooccurrence.ts <directory> [--min-support 3] [--max-tuple 6] [--top 25]\n",
  );
  process.exit(1);
}

function getFlag(name: string, defaultVal: number): number {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < args.length) return parseFloat(args[idx + 1]);
  return defaultVal;
}

const minSupport = getFlag("min-support", 3);
const maxTuple = getFlag("max-tuple", 6);
const top = getFlag("top", 25);

const parseStart = performance.now();
const files = parseDirectory(directory);
const parseTimeMs = performance.now() - parseStart;
const functionCount = files.reduce((s, f) => s + f.functions.length, 0);

process.stderr.write(
  `Parsed ${files.length} files (${functionCount} functions) in ${parseTimeMs.toFixed(0)}ms\n`,
);

const detectStart = performance.now();
const pairs = minePairs(files, minSupport);
process.stderr.write(`Found ${pairs.size} frequent pairs\n`);

const tuples = expandTuples(files, pairs, minSupport, maxTuple);
process.stderr.write(`Expanded to ${tuples.length} tuples\n`);

const validated = validateTuples(tuples, files, 0.5);
const maximal = filterMaximal(validated);
maximal.sort((a, b) => {
  if (b.names.length !== a.names.length) return b.names.length - a.names.length;
  return b.support - a.support;
});

const detectTimeMs = performance.now() - detectStart;
process.stderr.write(
  `Filtered to ${maximal.length} maximal tuples in ${detectTimeMs.toFixed(0)}ms\n`,
);

process.stdout.write(
  `${formatResults(validated, maximal, files.length, functionCount, parseTimeMs, top)}\n`,
);
