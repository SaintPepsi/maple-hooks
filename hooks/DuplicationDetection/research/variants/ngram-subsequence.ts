#!/usr/bin/env bun
// Cycle 1: N-gram AST Subsequence Detection
//
// Sliding windows of N consecutive AST node types reveal shared sub-patterns
// even when full function structures differ. Functions following the same
// template share characteristic n-grams.
//
// Usage: bun Tools/pattern-detector/variants/ngram-subsequence.ts <directory> [--n 4] [--min-files 2] [--min-functions 3] [--top 20]

import { parseDirectory } from "@tools/pattern-detector/parse";
import type { ParsedFunction, ParsedFile } from "@tools/pattern-detector/types";

// ─── N-gram Extraction ──────────────────────────────────────────────────────

function extractNgrams(nodeTypes: string[], n: number): string[] {
  if (nodeTypes.length < n) return [];
  const ngrams: string[] = [];
  for (let i = 0; i <= nodeTypes.length - n; i++) {
    ngrams.push(nodeTypes.slice(i, i + n).join("→"));
  }
  return ngrams;
}

function uniqueNgrams(nodeTypes: string[], n: number): Set<string> {
  return new Set(extractNgrams(nodeTypes, n));
}

// ─── Inverted Index ─────────────────────────────────────────────────────────

interface FunctionRef {
  fn: ParsedFunction;
  fileIndex: number;
}

function buildInvertedIndex(
  files: ParsedFile[],
  n: number,
): Map<string, FunctionRef[]> {
  const index = new Map<string, FunctionRef[]>();

  for (let fi = 0; fi < files.length; fi++) {
    for (const fn of files[fi].functions) {
      const ngrams = uniqueNgrams(fn.bodyNodeTypes, n);
      for (const ng of ngrams) {
        const existing = index.get(ng);
        if (existing) existing.push({ fn, fileIndex: fi });
        else index.set(ng, [{ fn, fileIndex: fi }]);
      }
    }
  }

  return index;
}

// ─── Shared N-gram Analysis ─────────────────────────────────────────────────

interface NgramCluster {
  ngram: string;
  functions: FunctionRef[];
  fileCount: number;
}

function findSharedNgrams(
  index: Map<string, FunctionRef[]>,
  minFunctions: number,
  minFiles: number,
): NgramCluster[] {
  const clusters: NgramCluster[] = [];

  for (const [ngram, refs] of index) {
    if (refs.length < minFunctions) continue;
    const fileCount = new Set(refs.map((r) => r.fileIndex)).size;
    if (fileCount < minFiles) continue;
    clusters.push({ ngram, functions: refs, fileCount });
  }

  // Sort by function count descending, then file spread
  clusters.sort((a, b) => {
    if (b.functions.length !== a.functions.length) return b.functions.length - a.functions.length;
    return b.fileCount - a.fileCount;
  });

  return clusters;
}

// ─── Jaccard Similarity Clustering ──────────────────────────────────────────

interface FunctionPair {
  a: ParsedFunction;
  b: ParsedFunction;
  jaccardSimilarity: number;
  sharedNgramCount: number;
  sharedNgrams: string[];
}

function findSimilarPairs(
  files: ParsedFile[],
  n: number,
  threshold: number,
): FunctionPair[] {
  // Build per-function ngram sets
  const allFunctions: { fn: ParsedFunction; ngrams: Set<string> }[] = [];
  for (const file of files) {
    for (const fn of file.functions) {
      const ngrams = uniqueNgrams(fn.bodyNodeTypes, n);
      if (ngrams.size >= 3) { // Skip trivial functions
        allFunctions.push({ fn, ngrams });
      }
    }
  }

  const pairs: FunctionPair[] = [];

  // Compare all pairs (O(n^2) but filtered by minimum shared count)
  for (let i = 0; i < allFunctions.length; i++) {
    for (let j = i + 1; j < allFunctions.length; j++) {
      const a = allFunctions[i];
      const b = allFunctions[j];

      // Skip same-function comparisons
      if (a.fn.file === b.fn.file && a.fn.name === b.fn.name) continue;

      // Quick intersection
      const shared: string[] = [];
      for (const ng of a.ngrams) {
        if (b.ngrams.has(ng)) shared.push(ng);
      }

      if (shared.length === 0) continue;

      const unionSize = a.ngrams.size + b.ngrams.size - shared.length;
      const jaccard = shared.length / unionSize;

      if (jaccard >= threshold) {
        pairs.push({
          a: a.fn,
          b: b.fn,
          jaccardSimilarity: jaccard,
          sharedNgramCount: shared.length,
          sharedNgrams: shared.slice(0, 5), // Keep top 5 for evidence
        });
      }
    }
  }

  pairs.sort((a, b) => b.jaccardSimilarity - a.jaccardSimilarity);
  return pairs;
}

// ─── Greedy Clustering from Pairs ───────────────────────────────────────────

interface NgramFunctionCluster {
  id: number;
  members: ParsedFunction[];
  avgSimilarity: number;
  representativeNgrams: string[];
}

function clusterFromPairs(pairs: FunctionPair[], threshold: number): NgramFunctionCluster[] {
  // Union-find for clustering
  const parent = new Map<string, string>();
  const fnKey = (fn: ParsedFunction): string => `${fn.file}:${fn.name}:${fn.line}`;

  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    // Path compression
    let cur = x;
    while (cur !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  function union(a: string, b: string): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  // Build function lookup
  const fnMap = new Map<string, ParsedFunction>();
  const pairNgrams = new Map<string, string[]>();

  for (const pair of pairs) {
    if (pair.jaccardSimilarity < threshold) continue;
    const ka = fnKey(pair.a);
    const kb = fnKey(pair.b);
    union(ka, kb);
    fnMap.set(ka, pair.a);
    fnMap.set(kb, pair.b);
    // Collect representative ngrams
    const key = [ka, kb].sort().join("||");
    pairNgrams.set(key, pair.sharedNgrams);
  }

  // Group by root
  const groups = new Map<string, Set<string>>();
  for (const key of fnMap.keys()) {
    const root = find(key);
    const existing = groups.get(root);
    if (existing) existing.add(key);
    else groups.set(root, new Set([key]));
  }

  const clusters: NgramFunctionCluster[] = [];
  let id = 1;

  for (const memberKeys of groups.values()) {
    if (memberKeys.size < 2) continue;
    const members = [...memberKeys].map((k) => fnMap.get(k)!);

    // Collect all representative ngrams from pairs in this cluster
    const allNgrams = new Set<string>();
    const memberArr = [...memberKeys];
    for (let i = 0; i < memberArr.length; i++) {
      for (let j = i + 1; j < memberArr.length; j++) {
        const key = [memberArr[i], memberArr[j]].sort().join("||");
        const ngs = pairNgrams.get(key);
        if (ngs) ngs.forEach((ng) => allNgrams.add(ng));
      }
    }

    // Compute average similarity among cluster members
    let simSum = 0;
    let simCount = 0;
    for (const pair of pairs) {
      const ka = fnKey(pair.a);
      const kb = fnKey(pair.b);
      if (memberKeys.has(ka) && memberKeys.has(kb)) {
        simSum += pair.jaccardSimilarity;
        simCount++;
      }
    }

    clusters.push({
      id: id++,
      members,
      avgSimilarity: simCount > 0 ? simSum / simCount : 0,
      representativeNgrams: [...allNgrams].slice(0, 8),
    });
  }

  clusters.sort((a, b) => b.avgSimilarity - a.avgSimilarity);
  return clusters;
}

// ─── Output Formatting ──────────────────────────────────────────────────────

function shortenPath(filePath: string): string {
  const home = require("os").homedir() as string;
  if (filePath.startsWith(home)) return "~" + filePath.slice(home.length);
  return filePath;
}

function formatResults(
  clusters: NgramFunctionCluster[],
  sharedNgrams: NgramCluster[],
  n: number,
  fileCount: number,
  functionCount: number,
  parseTimeMs: number,
  top: number,
): string {
  const lines: string[] = [];

  lines.push("\nN-gram AST Subsequence Detector (Cycle 1)");
  lines.push("═".repeat(45));
  lines.push(`N-gram size: ${n} | Scanned: ${fileCount} files, ${functionCount} functions | Parse: ${parseTimeMs.toFixed(0)}ms`);

  // Part 1: Most shared n-grams (template fingerprints)
  lines.push(`\n--- Most Shared N-grams (template fingerprints) ---`);
  lines.push(`Found ${sharedNgrams.length} n-grams shared across 2+ files\n`);

  for (const c of sharedNgrams.slice(0, top)) {
    const funcNames = [...new Set(c.functions.map((r) => r.fn.name))].slice(0, 5).join(", ");
    lines.push(`  "${c.ngram}"`);
    lines.push(`    ${c.functions.length} functions across ${c.fileCount} files: ${funcNames}${c.functions.length > 5 ? "..." : ""}`);
  }

  // Part 2: Function clusters by Jaccard similarity
  lines.push(`\n--- Function Clusters (Jaccard n-gram similarity) ---`);
  lines.push(`Found ${clusters.length} clusters\n`);

  for (const c of clusters.slice(0, top)) {
    lines.push(`  Cluster ${c.id} (${c.members.length} members, avg similarity ${(c.avgSimilarity * 100).toFixed(0)}%):`);
    for (const m of c.members) {
      lines.push(`    - ${m.name} (${shortenPath(m.file)}:${m.line})`);
    }
    if (c.representativeNgrams.length > 0) {
      lines.push(`    Shared patterns: ${c.representativeNgrams.slice(0, 3).join("; ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const directory = args.find((a) => !a.startsWith("--"));

if (!directory) {
  process.stderr.write("Usage: bun Tools/pattern-detector/variants/ngram-subsequence.ts <directory> [--n 4] [--min-files 2] [--min-functions 3] [--top 20] [--threshold 0.3]\n");
  process.exit(1);
}

function getFlag(name: string, defaultVal: number): number {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < args.length) return parseFloat(args[idx + 1]);
  return defaultVal;
}

const n = getFlag("n", 4);
const minFiles = getFlag("min-files", 2);
const minFunctions = getFlag("min-functions", 3);
const top = getFlag("top", 20);
const threshold = getFlag("threshold", 0.3);

const parseStart = performance.now();
const files = parseDirectory(directory);
const parseTimeMs = performance.now() - parseStart;
const functionCount = files.reduce((s, f) => s + f.functions.length, 0);

process.stderr.write(`Parsed ${files.length} files (${functionCount} functions) in ${parseTimeMs.toFixed(0)}ms\n`);

// Build inverted index and find shared n-grams
const index = buildInvertedIndex(files, n);
const sharedNgrams = findSharedNgrams(index, minFunctions, minFiles);

process.stderr.write(`Found ${sharedNgrams.length} shared n-grams across ${minFiles}+ files\n`);

// Find similar pairs and cluster
const detectStart = performance.now();
const pairs = findSimilarPairs(files, n, threshold);
const clusters = clusterFromPairs(pairs, threshold);
const detectTimeMs = performance.now() - detectStart;

process.stderr.write(`Found ${pairs.length} similar pairs, ${clusters.length} clusters in ${detectTimeMs.toFixed(0)}ms\n`);

// Output
process.stdout.write(formatResults(clusters, sharedNgrams, n, files.length, functionCount, parseTimeMs, top) + "\n");
