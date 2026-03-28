#!/usr/bin/env bun
// Cycle 4: File-Level Template Detection
//
// PROBLEM: 21 test files export exactly {makeDeps, makeInput}, 12 export {runHook}.
// All prior detectors work at function-level. None detect that entire FILES follow
// the same template — same combination of helper functions serving the same roles.
//
// APPROACH: Fingerprint files by their exported function "interface" (sorted set of
// function names), then score template similarity between files using function-level
// body similarity. This detects "this file was copy-pasted from that file and adapted."
//
// Usage: bun Tools/pattern-detector/variants/file-template.ts <directory> [--min-files 2] [--top 30]

import { parseDirectory } from "@tools/pattern-detector/parse";
import { bodySimilarity } from "@tools/pattern-detector/similarity";
import type { ParsedFile, ParsedFunction } from "@tools/pattern-detector/types";

// ─── File Interface Fingerprinting ──────────────────────────────────────────

interface FileInterface {
  file: ParsedFile;
  functionNames: string[];
  fingerprint: string;       // sorted function names joined
  functionCount: number;
  category: FileCategory;
}

type FileCategory = "test" | "contract" | "adapter" | "handler" | "lib" | "other";

function categorizeFile(path: string): FileCategory {
  if (path.includes(".test.") || path.includes(".spec.")) return "test";
  if (path.includes(".contract.")) return "contract";
  if (path.includes("/adapters/")) return "adapter";
  if (path.includes("/handlers/")) return "handler";
  if (path.includes("/lib/")) return "lib";
  return "other";
}

function buildFileInterface(file: ParsedFile): FileInterface {
  const names = file.functions.map((f) => f.name).sort();
  return {
    file,
    functionNames: names,
    fingerprint: names.join("|"),
    functionCount: names.length,
    category: categorizeFile(file.path),
  };
}

// ─── Exact Template Clustering ──────────────────────────────────────────────

interface TemplateCluster {
  fingerprint: string;
  functionNames: string[];
  members: FileInterface[];
  avgFileSimilarity: number;
  category: FileCategory;
}

function clusterByExactInterface(
  interfaces: FileInterface[],
  minFiles: number,
): TemplateCluster[] {
  const groups = new Map<string, FileInterface[]>();
  for (const iface of interfaces) {
    if (iface.functionCount === 0) continue;
    const existing = groups.get(iface.fingerprint);
    if (existing) existing.push(iface);
    else groups.set(iface.fingerprint, [iface]);
  }

  const clusters: TemplateCluster[] = [];
  for (const [fp, members] of groups) {
    if (members.length < minFiles) continue;

    const avgSim = sampleFileSimilarity(members, 15);

    // Dominant category
    const catCounts = new Map<FileCategory, number>();
    for (const m of members) {
      catCounts.set(m.category, (catCounts.get(m.category) ?? 0) + 1);
    }
    let dominantCat: FileCategory = "other";
    let maxCount = 0;
    for (const [cat, count] of catCounts) {
      if (count > maxCount) { dominantCat = cat; maxCount = count; }
    }

    clusters.push({
      fingerprint: fp,
      functionNames: members[0].functionNames,
      members,
      avgFileSimilarity: avgSim,
      category: dominantCat,
    });
  }

  clusters.sort((a, b) => b.members.length - a.members.length);
  return clusters;
}

// ─── Fuzzy Template Matching ────────────────────────────────────────────────
// Files that share most (but not all) function names — detects adapted templates

interface FuzzyMatch {
  fileA: FileInterface;
  fileB: FileInterface;
  sharedNames: string[];
  jaccardNames: number;
  avgBodySim: number;
}

function findFuzzyMatches(
  interfaces: FileInterface[],
  minJaccard: number,
  maxPairs: number,
): FuzzyMatch[] {
  const matches: FuzzyMatch[] = [];
  let pairsChecked = 0;

  for (let i = 0; i < interfaces.length && pairsChecked < maxPairs; i++) {
    const a = interfaces[i];
    if (a.functionCount < 2) continue;

    for (let j = i + 1; j < interfaces.length && pairsChecked < maxPairs; j++) {
      const b = interfaces[j];
      if (b.functionCount < 2) continue;

      // Quick check: same category and similar function count
      if (a.category !== b.category) continue;
      if (Math.abs(a.functionCount - b.functionCount) > 3) continue;

      pairsChecked++;

      const setA = new Set(a.functionNames);
      const setB = new Set(b.functionNames);
      const shared = a.functionNames.filter((n) => setB.has(n));
      const unionSize = new Set([...a.functionNames, ...b.functionNames]).size;
      const jaccard = shared.length / unionSize;

      if (jaccard < minJaccard) continue;
      if (jaccard === 1.0) continue; // Skip exact matches (already covered)

      // Compute body similarity for shared functions
      const bodySimScores: number[] = [];
      for (const name of shared) {
        const fnA = a.file.functions.find((f) => f.name === name);
        const fnB = b.file.functions.find((f) => f.name === name);
        if (fnA && fnB) {
          bodySimScores.push(bodySimilarity(fnA, fnB));
        }
      }
      const avgBody = bodySimScores.length > 0
        ? bodySimScores.reduce((s, v) => s + v, 0) / bodySimScores.length
        : 0;

      matches.push({
        fileA: a,
        fileB: b,
        sharedNames: shared,
        jaccardNames: jaccard,
        avgBodySim: avgBody,
      });
    }
  }

  matches.sort((a, b) => b.jaccardNames - a.jaccardNames);
  return matches;
}

// ─── File Similarity Scoring ────────────────────────────────────────────────

// Score similarity between two files by matching functions by name and comparing bodies
function fileSimilarity(a: FileInterface, b: FileInterface): number {
  const nameSetB = new Set(b.functionNames);
  const shared = a.functionNames.filter((n) => nameSetB.has(n));
  if (shared.length === 0) return 0;

  const bodyScores: number[] = [];
  for (const name of shared) {
    const fnA = a.file.functions.find((f) => f.name === name);
    const fnB = b.file.functions.find((f) => f.name === name);
    if (fnA && fnB) bodyScores.push(bodySimilarity(fnA, fnB));
  }

  const avgBody = bodyScores.length > 0
    ? bodyScores.reduce((s, v) => s + v, 0) / bodyScores.length
    : 0;

  const nameOverlap = shared.length / Math.max(a.functionCount, b.functionCount);
  return nameOverlap * 0.4 + avgBody * 0.6;
}

function sampleFileSimilarity(members: FileInterface[], maxPairs: number): number {
  if (members.length < 2) return 0;

  const allPairs: [number, number][] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      allPairs.push([i, j]);
    }
  }

  const step = Math.max(1, Math.floor(allPairs.length / maxPairs));
  let total = 0;
  let count = 0;
  for (let k = 0; k < allPairs.length && count < maxPairs; k += step) {
    const [i, j] = allPairs[k];
    total += fileSimilarity(members[i], members[j]);
    count++;
  }

  return count > 0 ? total / count : 0;
}

// ─── Category Summary ───────────────────────────────────────────────────────

interface CategoryStats {
  category: FileCategory;
  totalFiles: number;
  templatedFiles: number;
  templateCount: number;
}

function categorySummary(
  interfaces: FileInterface[],
  clusters: TemplateCluster[],
): CategoryStats[] {
  const totals = new Map<FileCategory, number>();
  for (const i of interfaces) {
    totals.set(i.category, (totals.get(i.category) ?? 0) + 1);
  }

  const templated = new Map<FileCategory, number>();
  const templateCounts = new Map<FileCategory, number>();
  for (const c of clusters) {
    templated.set(c.category, (templated.get(c.category) ?? 0) + c.members.length);
    templateCounts.set(c.category, (templateCounts.get(c.category) ?? 0) + 1);
  }

  return [...totals.entries()]
    .map(([cat, total]) => ({
      category: cat,
      totalFiles: total,
      templatedFiles: templated.get(cat) ?? 0,
      templateCount: templateCounts.get(cat) ?? 0,
    }))
    .sort((a, b) => b.templatedFiles - a.templatedFiles);
}

// ─── Output ─────────────────────────────────────────────────────────────────

function shortenPath(filePath: string): string {
  const home = require("os").homedir() as string;
  if (filePath.startsWith(home)) return "~" + filePath.slice(home.length);
  return filePath;
}

function formatResults(
  clusters: TemplateCluster[],
  fuzzyMatches: FuzzyMatch[],
  catStats: CategoryStats[],
  fileCount: number,
  functionCount: number,
  parseTimeMs: number,
  top: number,
): string {
  const lines: string[] = [];

  lines.push("\nFile-Level Template Detection (Cycle 4)");
  lines.push("═".repeat(42));
  lines.push(`Scanned: ${fileCount} files, ${functionCount} functions | Parse: ${parseTimeMs.toFixed(0)}ms`);

  // Category stats
  lines.push(`\n--- File Category Distribution ---\n`);
  for (const s of catStats) {
    const pct = s.totalFiles > 0 ? ((s.templatedFiles / s.totalFiles) * 100).toFixed(0) : "0";
    lines.push(`  ${s.category.padEnd(12)} ${s.totalFiles} files, ${s.templatedFiles} templated (${pct}%), ${s.templateCount} templates`);
  }

  // Exact template clusters
  lines.push(`\n--- Exact Template Clusters (files with identical function sets) ---`);
  lines.push(`Found ${clusters.length} template(s)\n`);

  for (const c of clusters.slice(0, top)) {
    lines.push(`  Template: {${c.functionNames.join(", ")}} [${c.category}]`);
    lines.push(`  ${c.members.length} files, avg similarity ${(c.avgFileSimilarity * 100).toFixed(0)}%\n`);

    for (const m of c.members.slice(0, 8)) {
      lines.push(`    - ${shortenPath(m.file.path)}`);
    }
    if (c.members.length > 8) {
      lines.push(`    ... and ${c.members.length - 8} more`);
    }
    lines.push("");
  }

  // Fuzzy matches
  lines.push(`\n--- Fuzzy Template Matches (files sharing most functions) ---`);
  lines.push(`Found ${fuzzyMatches.length} near-template pair(s)\n`);

  for (const m of fuzzyMatches.slice(0, top)) {
    const pathA = shortenPath(m.fileA.file.path).replace(/.*pai-hooks\//, "");
    const pathB = shortenPath(m.fileB.file.path).replace(/.*pai-hooks\//, "");
    lines.push(`  ${pathA}`);
    lines.push(`  ${pathB}`);
    lines.push(`    Shared: {${m.sharedNames.join(", ")}} (${(m.jaccardNames * 100).toFixed(0)}% name overlap, ${(m.avgBodySim * 100).toFixed(0)}% body sim)`);
    lines.push("");
  }

  return lines.join("\n");
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const directory = args.find((a) => !a.startsWith("--"));

if (!directory) {
  process.stderr.write("Usage: bun Tools/pattern-detector/variants/file-template.ts <directory> [--min-files 2] [--top 30] [--fuzzy-threshold 0.5]\n");
  process.exit(1);
}

function getFlag(name: string, defaultVal: number): number {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < args.length) return parseFloat(args[idx + 1]);
  return defaultVal;
}

const minFiles = getFlag("min-files", 2);
const top = getFlag("top", 30);
const fuzzyThreshold = getFlag("fuzzy-threshold", 0.5);

const parseStart = performance.now();
const files = parseDirectory(directory);
const parseTimeMs = performance.now() - parseStart;
const functionCount = files.reduce((s, f) => s + f.functions.length, 0);

process.stderr.write(`Parsed ${files.length} files (${functionCount} functions) in ${parseTimeMs.toFixed(0)}ms\n`);

const interfaces = files.map(buildFileInterface);

const detectStart = performance.now();
const clusters = clusterByExactInterface(interfaces, minFiles);
const fuzzyMatches = findFuzzyMatches(interfaces, fuzzyThreshold, 50000);
const catStats = categorySummary(interfaces, clusters);
const detectTimeMs = performance.now() - detectStart;

process.stderr.write(`Found ${clusters.length} templates, ${fuzzyMatches.length} fuzzy matches in ${detectTimeMs.toFixed(0)}ms\n`);

process.stdout.write(formatResults(clusters, fuzzyMatches, catStats, files.length, functionCount, parseTimeMs, top) + "\n");
