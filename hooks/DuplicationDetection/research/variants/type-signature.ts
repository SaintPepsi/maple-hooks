#!/usr/bin/env bun
// Cycle 5: Type-Signature-Gated Similarity Clustering
//
// PROBLEM: Adapter functions like readFile/readDir/ensureDir/deleteFile have
// different names, different imports, but identical type signatures (string -> Result)
// and 77% body similarity. No prior detector catches them because:
//   - Structural hash: different bodies
//   - N-gram: too many shared n-grams across unrelated functions
//   - Role naming: different names
//   - File template: different file structures
//   - CFG skeleton: similar but not identical control flow
//
// APPROACH: Use type signatures as a cheap pre-filter (O(1) grouping), then
// run body similarity only within signature groups. This finds functions that
// do the same thing to the same types, regardless of naming or import choices.
//
// Usage: bun Tools/pattern-detector/variants/type-signature.ts <directory> [--min-sim 0.5] [--min-group 3] [--top 25]

import { parseDirectory } from "@tools/pattern-detector/parse";
import { bodySimilarity } from "@tools/pattern-detector/similarity";
import type { ParsedFile, ParsedFunction } from "@tools/pattern-detector/types";

// ─── Type Signature Extraction ──────────────────────────────────────────────

interface TypeSignature {
  paramTypes: string[];
  returnType: string;
  arity: number;
  fingerprint: string;
}

function extractSignature(fn: ParsedFunction): TypeSignature {
  const paramTypes = fn.params.map((p) => p.typeAnnotation ?? "none");
  const returnType = fn.returnType ?? "void";
  return {
    paramTypes,
    returnType,
    arity: fn.params.length,
    fingerprint: `(${paramTypes.join(",")})→${returnType}`,
  };
}

// ─── Signature Grouping ─────────────────────────────────────────────────────

interface SignatureGroup {
  signature: TypeSignature;
  members: ParsedFunction[];
  fileCount: number;
}

function groupBySignature(files: ParsedFile[], minGroup: number): SignatureGroup[] {
  const groups = new Map<string, ParsedFunction[]>();

  for (const file of files) {
    for (const fn of file.functions) {
      const sig = extractSignature(fn);
      const existing = groups.get(sig.fingerprint);
      if (existing) existing.push(fn);
      else groups.set(sig.fingerprint, [fn]);
    }
  }

  const result: SignatureGroup[] = [];
  for (const [_fp, members] of groups) {
    const fileCount = new Set(members.map((m) => m.file)).size;
    if (members.length < minGroup || fileCount < 2) continue;

    result.push({
      signature: extractSignature(members[0]),
      members,
      fileCount,
    });
  }

  result.sort((a, b) => b.members.length - a.members.length);
  return result;
}

// ─── Similarity Sub-Clustering ──────────────────────────────────────────────

interface SimilarityCluster {
  signatureFingerprint: string;
  members: ParsedFunction[];
  avgSimilarity: number;
  fileCount: number;
  distinctNames: string[];
  isNameDiverse: boolean; // true if 2+ distinct names — the interesting case
}

function subClusterByBody(
  group: SignatureGroup,
  minSim: number,
  maxPairs: number,
): SimilarityCluster[] {
  const members = group.members;
  if (members.length < 2) return [];

  // Compute pairwise similarities (sample if too large)
  const pairs: { i: number; j: number; sim: number }[] = [];
  let pairCount = 0;
  const step =
    members.length > 30 ? Math.ceil((members.length * (members.length - 1)) / 2 / maxPairs) : 1;
  let idx = 0;

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      idx++;
      if (idx % step !== 0) continue;
      const sim = bodySimilarity(members[i], members[j]);
      if (sim >= minSim) {
        pairs.push({ i, j, sim });
      }
      pairCount++;
      if (pairCount >= maxPairs) break;
    }
    if (pairCount >= maxPairs) break;
  }

  // Union-find clustering from pairs
  const parent = new Map<number, number>();
  function find(x: number): number {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = x;
    while (cur !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  for (const p of pairs) union(p.i, p.j);

  // Build clusters
  const clusterMap = new Map<number, number[]>();
  for (const p of pairs) {
    for (const idx of [p.i, p.j]) {
      const root = find(idx);
      const existing = clusterMap.get(root);
      if (existing) {
        if (!existing.includes(idx)) existing.push(idx);
      } else clusterMap.set(root, [idx]);
    }
  }

  const clusters: SimilarityCluster[] = [];
  for (const indices of clusterMap.values()) {
    if (indices.length < 2) continue;

    const clusterMembers = indices.map((i) => members[i]);
    const distinctNames = [...new Set(clusterMembers.map((m) => m.name))];
    const fileCount = new Set(clusterMembers.map((m) => m.file)).size;
    if (fileCount < 2) continue;

    // Compute avg similarity within cluster
    let simSum = 0;
    let simCount = 0;
    for (const p of pairs) {
      if (indices.includes(p.i) && indices.includes(p.j)) {
        simSum += p.sim;
        simCount++;
      }
    }

    clusters.push({
      signatureFingerprint: group.signature.fingerprint,
      members: clusterMembers,
      avgSimilarity: simCount > 0 ? simSum / simCount : 0,
      fileCount,
      distinctNames,
      isNameDiverse: distinctNames.length >= 2,
    });
  }

  clusters.sort((a, b) => b.avgSimilarity - a.avgSimilarity);
  return clusters;
}

// ─── Novelty Analysis ───────────────────────────────────────────────────────
// Which clusters are NOT detectable by name-based approaches?

interface NoveltyReport {
  totalClusters: number;
  nameDiverseClusters: number; // 2+ distinct names in cluster
  nameDiverseMembers: number;
  topNovelClusters: SimilarityCluster[];
}

function analyzeNovelty(clusters: SimilarityCluster[]): NoveltyReport {
  const nameDiverse = clusters.filter((c) => c.isNameDiverse);
  return {
    totalClusters: clusters.length,
    nameDiverseClusters: nameDiverse.length,
    nameDiverseMembers: nameDiverse.reduce((s, c) => s + c.members.length, 0),
    topNovelClusters: nameDiverse.sort((a, b) => b.members.length - a.members.length).slice(0, 20),
  };
}

// ─── Output ─────────────────────────────────────────────────────────────────

function shortenPath(filePath: string): string {
  const home = require("node:os").homedir() as string;
  if (filePath.startsWith(home)) return `~${filePath.slice(home.length)}`;
  return filePath;
}

function formatResults(
  groups: SignatureGroup[],
  allClusters: SimilarityCluster[],
  novelty: NoveltyReport,
  fileCount: number,
  functionCount: number,
  parseTimeMs: number,
  detectTimeMs: number,
  top: number,
): string {
  const lines: string[] = [];

  lines.push("\nType-Signature-Gated Similarity Clustering (Cycle 5)");
  lines.push("═".repeat(54));
  lines.push(
    `Scanned: ${fileCount} files, ${functionCount} functions | Parse: ${parseTimeMs.toFixed(0)}ms | Detect: ${detectTimeMs.toFixed(0)}ms`,
  );
  lines.push(`Signature groups: ${groups.length} | Similarity clusters: ${allClusters.length}`);

  // Novelty summary
  lines.push(`\n--- Novelty Analysis (what other detectors miss) ---`);
  lines.push(
    `Name-diverse clusters (2+ distinct names): ${novelty.nameDiverseClusters} / ${novelty.totalClusters}`,
  );
  lines.push(`Functions in name-diverse clusters: ${novelty.nameDiverseMembers}`);
  lines.push(`These are invisible to role-naming and file-template detectors.\n`);

  // Top novel clusters (the real value)
  lines.push(`--- Top Name-Diverse Clusters (different names, same type, similar body) ---\n`);
  for (const c of novelty.topNovelClusters.slice(0, top)) {
    lines.push(`  Sig: ${c.signatureFingerprint}`);
    lines.push(
      `  ${c.members.length} functions, ${c.fileCount} files, ${(c.avgSimilarity * 100).toFixed(0)}% avg body sim`,
    );
    lines.push(
      `  Names: ${c.distinctNames.slice(0, 8).join(", ")}${c.distinctNames.length > 8 ? "..." : ""}`,
    );
    for (const m of c.members.slice(0, 6)) {
      lines.push(
        `    - ${m.name} (${shortenPath(m.file).replace(/.*maple-hooks\//, "")}:${m.line})`,
      );
    }
    if (c.members.length > 6) {
      lines.push(`    ... and ${c.members.length - 6} more`);
    }
    lines.push("");
  }

  // All clusters summary
  lines.push(`--- All Clusters (including same-name) ---`);
  lines.push(`Found ${allClusters.length} total clusters\n`);
  for (const c of allClusters.slice(0, Math.min(top, 15))) {
    const diverse = c.isNameDiverse ? " [NAME-DIVERSE]" : "";
    lines.push(
      `  ${c.signatureFingerprint} — ${c.members.length} fns, ${(c.avgSimilarity * 100).toFixed(0)}% sim, names: ${c.distinctNames.slice(0, 4).join(", ")}${diverse}`,
    );
  }

  return lines.join("\n");
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const directory = args.find((a) => !a.startsWith("--"));

if (!directory) {
  process.stderr.write(
    "Usage: bun Tools/pattern-detector/variants/type-signature.ts <directory> [--min-sim 0.5] [--min-group 3] [--top 25]\n",
  );
  process.exit(1);
}

function getFlag(name: string, defaultVal: number): number {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < args.length) return parseFloat(args[idx + 1]);
  return defaultVal;
}

const minSim = getFlag("min-sim", 0.5);
const minGroup = getFlag("min-group", 3);
const top = getFlag("top", 25);

const parseStart = performance.now();
const files = parseDirectory(directory);
const parseTimeMs = performance.now() - parseStart;
const functionCount = files.reduce((s, f) => s + f.functions.length, 0);

process.stderr.write(
  `Parsed ${files.length} files (${functionCount} functions) in ${parseTimeMs.toFixed(0)}ms\n`,
);

const detectStart = performance.now();
const groups = groupBySignature(files, minGroup);
process.stderr.write(`Found ${groups.length} signature groups with ${minGroup}+ members\n`);

const allClusters: SimilarityCluster[] = [];
for (const group of groups) {
  const subClusters = subClusterByBody(group, minSim, 500);
  allClusters.push(...subClusters);
}
allClusters.sort((a, b) => b.members.length - a.members.length);

const novelty = analyzeNovelty(allClusters);
const detectTimeMs = performance.now() - detectStart;

process.stderr.write(
  `Found ${allClusters.length} similarity clusters (${novelty.nameDiverseClusters} name-diverse) in ${detectTimeMs.toFixed(0)}ms\n`,
);

process.stdout.write(
  `${formatResults(
    groups,
    allClusters,
    novelty,
    files.length,
    functionCount,
    parseTimeMs,
    detectTimeMs,
    top,
  )}\n`,
);
