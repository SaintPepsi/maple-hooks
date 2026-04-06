#!/usr/bin/env bun
// Cycle 3: Role-Based Name Clustering with Structural Validation
//
// PROBLEM: 44 makeDeps functions across 44 files serve the same architectural
// role (Deps factory) but differ structurally. No existing detector catches them.
// The signal is in the function name — it encodes the architectural role.
//
// APPROACH: Group functions by name, then validate with structural similarity
// to separate genuine role-based duplication from coincidental name collisions.
//
// Usage: bun Tools/pattern-detector/variants/role-naming.ts <directory> [--min-instances 3] [--min-files 2] [--top 30]

import { parseDirectory } from "@tools/pattern-detector/parse";
import { bodySimilarity } from "@tools/pattern-detector/similarity";
import type { ParsedFile, ParsedFunction } from "@tools/pattern-detector/types";

// ─── Name Normalization ─────────────────────────────────────────────────────

// Extract the "role" from a function name by stripping common prefixes/suffixes
// and normalizing to a canonical form.
// makeDeps → deps, makeInput → input, getFilePath → filepath, formatSuccess → success
function extractRole(name: string): string {
  let role = name;

  // Strip common prefixes
  const prefixes = [
    "make",
    "create",
    "build",
    "get",
    "set",
    "is",
    "has",
    "format",
    "parse",
    "handle",
    "process",
    "validate",
    "check",
    "compute",
    "calculate",
    "extract",
    "generate",
    "render",
    "setup",
    "init",
    "default",
  ];
  for (const p of prefixes) {
    if (
      role.startsWith(p) &&
      role.length > p.length &&
      role[p.length] === role[p.length].toUpperCase()
    ) {
      role = role.slice(p.length);
      break;
    }
  }

  // Strip common suffixes
  const suffixes = ["Sync", "Async", "Safe", "Default", "Internal", "Helper", "Impl"];
  for (const s of suffixes) {
    if (role.endsWith(s) && role.length > s.length) {
      role = role.slice(0, -s.length);
      break;
    }
  }

  return role.toLowerCase();
}

// Classify the "verb" (what architectural action this function performs)
type RoleVerb =
  | "factory"
  | "accessor"
  | "predicate"
  | "formatter"
  | "parser"
  | "handler"
  | "validator"
  | "other";

function classifyVerb(name: string): RoleVerb {
  if (/^(make|create|build|setup|init|default)/.test(name)) return "factory";
  if (/^(get|read|load|fetch|find)/.test(name)) return "accessor";
  if (/^(is|has|can|should)/.test(name)) return "predicate";
  if (/^(format|render|display|show|print)/.test(name)) return "formatter";
  if (/^(parse|extract|decode|deserialize)/.test(name)) return "parser";
  if (/^(handle|process|on[A-Z])/.test(name)) return "handler";
  if (/^(validate|check|verify|assert|ensure)/.test(name)) return "validator";
  return "other";
}

// ─── Clustering ─────────────────────────────────────────────────────────────

interface RoleCluster {
  exactName: string;
  role: string;
  verb: RoleVerb;
  members: ParsedFunction[];
  fileCount: number;
  avgBodySimilarity: number;
  structurallyValidated: boolean; // true if avg body similarity > 0.3
}

function clusterByExactName(
  files: ParsedFile[],
  minInstances: number,
  minFiles: number,
): RoleCluster[] {
  // Group by exact function name
  const groups = new Map<string, ParsedFunction[]>();
  for (const file of files) {
    for (const fn of file.functions) {
      const existing = groups.get(fn.name);
      if (existing) existing.push(fn);
      else groups.set(fn.name, [fn]);
    }
  }

  const clusters: RoleCluster[] = [];

  for (const [name, members] of groups) {
    if (members.length < minInstances) continue;
    const fileCount = new Set(members.map((m) => m.file)).size;
    if (fileCount < minFiles) continue;

    // Compute average pairwise body similarity (sample if too many pairs)
    const avgSim = sampleAvgSimilarity(members, 20);

    clusters.push({
      exactName: name,
      role: extractRole(name),
      verb: classifyVerb(name),
      members,
      fileCount,
      avgBodySimilarity: avgSim,
      structurallyValidated: avgSim > 0.3,
    });
  }

  clusters.sort((a, b) => b.members.length - a.members.length);
  return clusters;
}

function clusterByRole(files: ParsedFile[], minInstances: number, minFiles: number): RoleCluster[] {
  // Group by extracted role (normalized name)
  const groups = new Map<string, ParsedFunction[]>();
  for (const file of files) {
    for (const fn of file.functions) {
      const role = extractRole(fn.name);
      if (role.length < 3) continue; // Skip very short roles (noise)
      const existing = groups.get(role);
      if (existing) existing.push(fn);
      else groups.set(role, [fn]);
    }
  }

  const clusters: RoleCluster[] = [];

  for (const [role, members] of groups) {
    if (members.length < minInstances) continue;
    const fileCount = new Set(members.map((m) => m.file)).size;
    if (fileCount < minFiles) continue;

    const avgSim = sampleAvgSimilarity(members, 20);

    // Determine dominant verb
    const verbCounts = new Map<RoleVerb, number>();
    for (const m of members) {
      const v = classifyVerb(m.name);
      verbCounts.set(v, (verbCounts.get(v) ?? 0) + 1);
    }
    let dominantVerb: RoleVerb = "other";
    let maxCount = 0;
    for (const [v, c] of verbCounts) {
      if (c > maxCount) {
        dominantVerb = v;
        maxCount = c;
      }
    }

    clusters.push({
      exactName: `[role:${role}]`,
      role,
      verb: dominantVerb,
      members,
      fileCount,
      avgBodySimilarity: avgSim,
      structurallyValidated: avgSim > 0.3,
    });
  }

  clusters.sort((a, b) => b.members.length - a.members.length);
  return clusters;
}

// Sample up to maxPairs pairwise similarities to avoid O(n^2) blowup
function sampleAvgSimilarity(members: ParsedFunction[], maxPairs: number): number {
  if (members.length < 2) return 0;

  const allPairs: [number, number][] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      allPairs.push([i, j]);
    }
  }

  // Deterministic sample: take evenly spaced pairs
  const step = Math.max(1, Math.floor(allPairs.length / maxPairs));
  let total = 0;
  let count = 0;
  for (let k = 0; k < allPairs.length && count < maxPairs; k += step) {
    const [i, j] = allPairs[k];
    total += bodySimilarity(members[i], members[j]);
    count++;
  }

  return count > 0 ? total / count : 0;
}

// ─── Verb Distribution Analysis ─────────────────────────────────────────────

interface VerbStats {
  verb: RoleVerb;
  totalFunctions: number;
  clusteredFunctions: number;
  clusterCount: number;
  topRoles: string[];
}

function analyzeVerbDistribution(files: ParsedFile[], clusters: RoleCluster[]): VerbStats[] {
  // Count all functions by verb
  const verbTotals = new Map<RoleVerb, number>();
  for (const file of files) {
    for (const fn of file.functions) {
      const v = classifyVerb(fn.name);
      verbTotals.set(v, (verbTotals.get(v) ?? 0) + 1);
    }
  }

  // Count clustered functions by verb
  const verbClustered = new Map<RoleVerb, number>();
  const verbClusterCount = new Map<RoleVerb, number>();
  const verbRoles = new Map<RoleVerb, Set<string>>();

  for (const c of clusters) {
    verbClustered.set(c.verb, (verbClustered.get(c.verb) ?? 0) + c.members.length);
    verbClusterCount.set(c.verb, (verbClusterCount.get(c.verb) ?? 0) + 1);
    if (!verbRoles.has(c.verb)) verbRoles.set(c.verb, new Set());
    verbRoles.get(c.verb)!.add(c.role);
  }

  const stats: VerbStats[] = [];
  for (const [verb, total] of verbTotals) {
    stats.push({
      verb,
      totalFunctions: total,
      clusteredFunctions: verbClustered.get(verb) ?? 0,
      clusterCount: verbClusterCount.get(verb) ?? 0,
      topRoles: [...(verbRoles.get(verb) ?? [])].slice(0, 5),
    });
  }

  stats.sort((a, b) => b.clusteredFunctions - a.clusteredFunctions);
  return stats;
}

// ─── Output ─────────────────────────────────────────────────────────────────

function shortenPath(filePath: string): string {
  const home = require("node:os").homedir() as string;
  if (filePath.startsWith(home)) return `~${filePath.slice(home.length)}`;
  return filePath;
}

function formatResults(
  exactClusters: RoleCluster[],
  roleClusters: RoleCluster[],
  verbStats: VerbStats[],
  fileCount: number,
  functionCount: number,
  parseTimeMs: number,
  top: number,
): string {
  const lines: string[] = [];

  lines.push("\nRole-Based Name Clustering (Cycle 3)");
  lines.push("═".repeat(42));
  lines.push(
    `Scanned: ${fileCount} files, ${functionCount} functions | Parse: ${parseTimeMs.toFixed(0)}ms`,
  );

  // Verb distribution
  lines.push(`\n--- Architectural Verb Distribution ---\n`);
  for (const v of verbStats) {
    const pct =
      v.totalFunctions > 0 ? ((v.clusteredFunctions / v.totalFunctions) * 100).toFixed(0) : "0";
    lines.push(
      `  ${v.verb.padEnd(12)} ${v.totalFunctions} total, ${v.clusteredFunctions} clustered (${pct}%), ${v.clusterCount} clusters`,
    );
    if (v.topRoles.length > 0) {
      lines.push(`    Top roles: ${v.topRoles.join(", ")}`);
    }
  }

  // Exact name clusters
  lines.push(`\n--- Exact Name Clusters (same function name, different files) ---`);
  lines.push(`Found ${exactClusters.length} clusters\n`);

  for (const c of exactClusters.slice(0, top)) {
    const validated = c.structurallyValidated ? "validated" : "name-only";
    lines.push(
      `  ${c.exactName} [${c.verb}] — ${c.members.length} instances across ${c.fileCount} files (body sim: ${(c.avgBodySimilarity * 100).toFixed(0)}%, ${validated})`,
    );

    for (const m of c.members.slice(0, 6)) {
      lines.push(`    - ${shortenPath(m.file)}:${m.line}`);
    }
    if (c.members.length > 6) {
      lines.push(`    ... and ${c.members.length - 6} more`);
    }
    lines.push("");
  }

  // Role clusters (normalized names)
  lines.push(`\n--- Role Clusters (normalized name, groups variants) ---`);
  lines.push(`Found ${roleClusters.length} clusters\n`);

  for (const c of roleClusters.slice(0, top)) {
    const validated = c.structurallyValidated ? "validated" : "name-only";
    const memberNames = [...new Set(c.members.map((m) => m.name))].slice(0, 5).join(", ");
    lines.push(
      `  ${c.exactName} [${c.verb}] — ${c.members.length} instances across ${c.fileCount} files (body sim: ${(c.avgBodySimilarity * 100).toFixed(0)}%, ${validated})`,
    );
    lines.push(
      `    Names: ${memberNames}${[...new Set(c.members.map((m) => m.name))].length > 5 ? "..." : ""}`,
    );

    for (const m of c.members.slice(0, 4)) {
      lines.push(`    - ${m.name} (${shortenPath(m.file)}:${m.line})`);
    }
    if (c.members.length > 4) {
      lines.push(`    ... and ${c.members.length - 4} more`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const directory = args.find((a) => !a.startsWith("--"));

if (!directory) {
  process.stderr.write(
    "Usage: bun Tools/pattern-detector/variants/role-naming.ts <directory> [--min-instances 3] [--min-files 2] [--top 30]\n",
  );
  process.exit(1);
}

function getFlag(name: string, defaultVal: number): number {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < args.length) return parseFloat(args[idx + 1]);
  return defaultVal;
}

const minInstances = getFlag("min-instances", 3);
const minFiles = getFlag("min-files", 2);
const top = getFlag("top", 30);

const parseStart = performance.now();
const files = parseDirectory(directory);
const parseTimeMs = performance.now() - parseStart;
const functionCount = files.reduce((s, f) => s + f.functions.length, 0);

process.stderr.write(
  `Parsed ${files.length} files (${functionCount} functions) in ${parseTimeMs.toFixed(0)}ms\n`,
);

const detectStart = performance.now();
const exactClusters = clusterByExactName(files, minInstances, minFiles);
const roleClusters = clusterByRole(files, minInstances, minFiles);
const verbStats = analyzeVerbDistribution(files, exactClusters);
const detectTimeMs = performance.now() - detectStart;

process.stderr.write(
  `Found ${exactClusters.length} exact-name clusters, ${roleClusters.length} role clusters in ${detectTimeMs.toFixed(0)}ms\n`,
);

process.stdout.write(
  `${formatResults(
    exactClusters,
    roleClusters,
    verbStats,
    files.length,
    functionCount,
    parseTimeMs,
    top,
  )}\n`,
);
