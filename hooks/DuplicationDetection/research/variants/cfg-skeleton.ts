#!/usr/bin/env bun
// Cycle 2: Control Flow Graph Skeleton Fingerprinting
//
// Reduces functions to their branching structure (if/for/while/return/throw/switch)
// at each nesting depth, ignoring all expression-level detail. Functions with the
// same control flow skeleton match even when their expressions differ entirely.
//
// Usage: bun Tools/pattern-detector/variants/cfg-skeleton.ts <directory> [--min-depth 2] [--min-members 2] [--top 30]

import { parseDirectory } from "@tools/pattern-detector/parse";
import type { ParsedFunction, ParsedFile } from "@tools/pattern-detector/types";
import { sha256Short } from "@tools/pattern-detector/adapters";

// ─── Control Flow Node Classification ───────────────────────────────────────

// Node types that define control flow structure
const CONTROL_FLOW_NODES = new Set([
  "IfStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "SwitchStatement",
  "SwitchCase",
  "ReturnStatement",
  "ThrowStatement",
  "TryStatement",
  "CatchClause",
  "ConditionalExpression",  // ternary
]);

// Nodes that increase nesting depth
const NESTING_NODES = new Set([
  "IfStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "SwitchStatement",
  "TryStatement",
  "BlockStatement",
]);

// ─── Skeleton Extraction ────────────────────────────────────────────────────

interface SkeletonNode {
  type: string;
  depth: number;
}

// Extract control flow skeleton from the flat bodyNodeTypes array.
// We track nesting depth by counting BlockStatement entries/exits.
function extractSkeleton(nodeTypes: string[]): SkeletonNode[] {
  const skeleton: SkeletonNode[] = [];
  let depth = 0;

  for (let i = 0; i < nodeTypes.length; i++) {
    const t = nodeTypes[i];

    if (t === "BlockStatement") {
      // Check if preceded by a nesting node
      if (i > 0 && NESTING_NODES.has(nodeTypes[i - 1])) {
        depth++;
      }
    }

    if (CONTROL_FLOW_NODES.has(t)) {
      skeleton.push({ type: t, depth: Math.min(depth, 10) }); // Cap depth at 10
    }

    // Approximate depth tracking: BlockStatement followed by control flow
    // means we're inside a nested block. This is imprecise since we only
    // have a flat list, but captures the main structure.
  }

  return skeleton;
}

// ─── Skeleton Fingerprinting ────────────────────────────────────────────────

// Full skeleton fingerprint: type@depth sequence
function skeletonFingerprint(skeleton: SkeletonNode[]): string {
  return skeleton.map((n) => `${n.type}@${n.depth}`).join("→");
}

// Compressed skeleton: just the type sequence (ignoring depth)
function compressedFingerprint(skeleton: SkeletonNode[]): string {
  return skeleton.map((n) => n.type).join("→");
}

// Shape fingerprint: unique ordered set of (type, depth) pairs
// Captures "what control flow constructs at what depths" without caring about order
function shapeFingerprint(skeleton: SkeletonNode[]): string {
  const pairs = new Set(skeleton.map((n) => `${n.type}@${n.depth}`));
  return [...pairs].sort().join("|");
}

// Abbreviated skeleton: collapse consecutive same-type nodes
// if→if→return→for→return becomes if(2)→return→for→return
function abbreviatedFingerprint(skeleton: SkeletonNode[]): string {
  if (skeleton.length === 0) return "";
  const parts: string[] = [];
  let current = skeleton[0].type;
  let count = 1;

  for (let i = 1; i < skeleton.length; i++) {
    if (skeleton[i].type === current) {
      count++;
    } else {
      parts.push(count > 1 ? `${current}(${count})` : current);
      current = skeleton[i].type;
      count = 1;
    }
  }
  parts.push(count > 1 ? `${current}(${count})` : current);
  return parts.join("→");
}

// ─── Clustering ─────────────────────────────────────────────────────────────

interface SkeletonCluster {
  fingerprint: string;
  fingerprintType: string;
  hash: string;
  members: { fn: ParsedFunction; skeleton: SkeletonNode[] }[];
  skeletonLength: number;
}

function clusterByFingerprint(
  functions: { fn: ParsedFunction; skeleton: SkeletonNode[] }[],
  fingerprintFn: (s: SkeletonNode[]) => string,
  fingerprintType: string,
  minMembers: number,
  minDepth: number,
): SkeletonCluster[] {
  const groups = new Map<string, { fn: ParsedFunction; skeleton: SkeletonNode[] }[]>();

  for (const entry of functions) {
    // Filter: skeleton must have minimum depth (complexity)
    const maxDepth = entry.skeleton.reduce((m, n) => Math.max(m, n.depth), 0);
    if (maxDepth < minDepth) continue;
    if (entry.skeleton.length < 2) continue; // Skip trivial skeletons

    const fp = fingerprintFn(entry.skeleton);
    if (fp === "") continue;

    const existing = groups.get(fp);
    if (existing) existing.push(entry);
    else groups.set(fp, [entry]);
  }

  const clusters: SkeletonCluster[] = [];
  for (const [fp, members] of groups) {
    if (members.length < minMembers) continue;

    // Require members from at least 2 different files
    const files = new Set(members.map((m) => m.fn.file));
    if (files.size < 2) continue;

    clusters.push({
      fingerprint: fp,
      fingerprintType,
      hash: sha256Short(fp),
      members,
      skeletonLength: members[0].skeleton.length,
    });
  }

  clusters.sort((a, b) => {
    // Sort by member count descending, then skeleton length descending
    if (b.members.length !== a.members.length) return b.members.length - a.members.length;
    return b.skeletonLength - a.skeletonLength;
  });

  return clusters;
}

// ─── Output ─────────────────────────────────────────────────────────────────

function shortenPath(filePath: string): string {
  const home = require("os").homedir() as string;
  if (filePath.startsWith(home)) return "~" + filePath.slice(home.length);
  return filePath;
}

function formatResults(
  allClusters: Map<string, SkeletonCluster[]>,
  fileCount: number,
  functionCount: number,
  parseTimeMs: number,
  top: number,
): string {
  const lines: string[] = [];

  lines.push("\nCFG Skeleton Fingerprinting (Cycle 2)");
  lines.push("═".repeat(42));
  lines.push(`Scanned: ${fileCount} files, ${functionCount} functions | Parse: ${parseTimeMs.toFixed(0)}ms`);

  for (const [fpType, clusters] of allClusters) {
    lines.push(`\n--- ${fpType} ---`);
    lines.push(`Found ${clusters.length} cluster(s)\n`);

    for (const c of clusters.slice(0, top)) {
      const fileCount = new Set(c.members.map((m) => m.fn.file)).size;
      lines.push(`  [${c.hash}] ${c.members.length} members across ${fileCount} files (skeleton length: ${c.skeletonLength})`);

      // Show abbreviated skeleton
      const abbrev = abbreviatedFingerprint(c.members[0].skeleton);
      if (abbrev.length <= 120) {
        lines.push(`  Skeleton: ${abbrev}`);
      } else {
        lines.push(`  Skeleton: ${abbrev.slice(0, 117)}...`);
      }

      for (const m of c.members.slice(0, 8)) {
        lines.push(`    - ${m.fn.name} (${shortenPath(m.fn.file)}:${m.fn.line})`);
      }
      if (c.members.length > 8) {
        lines.push(`    ... and ${c.members.length - 8} more`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const directory = args.find((a) => !a.startsWith("--"));

if (!directory) {
  process.stderr.write("Usage: bun Tools/pattern-detector/variants/cfg-skeleton.ts <directory> [--min-depth 2] [--min-members 2] [--top 30]\n");
  process.exit(1);
}

function getFlag(name: string, defaultVal: number): number {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < args.length) return parseFloat(args[idx + 1]);
  return defaultVal;
}

const minDepth = getFlag("min-depth", 1);
const minMembers = getFlag("min-members", 2);
const top = getFlag("top", 30);

const parseStart = performance.now();
const files = parseDirectory(directory);
const parseTimeMs = performance.now() - parseStart;
const functionCount = files.reduce((s, f) => s + f.functions.length, 0);

process.stderr.write(`Parsed ${files.length} files (${functionCount} functions) in ${parseTimeMs.toFixed(0)}ms\n`);

// Extract skeletons for all functions
const allFunctions: { fn: ParsedFunction; skeleton: SkeletonNode[] }[] = [];
for (const file of files) {
  for (const fn of file.functions) {
    allFunctions.push({ fn, skeleton: extractSkeleton(fn.bodyNodeTypes) });
  }
}

const skeletonStats = allFunctions.map((f) => f.skeleton.length);
const avgSkeleton = skeletonStats.reduce((a, b) => a + b, 0) / skeletonStats.length;
process.stderr.write(`Avg skeleton length: ${avgSkeleton.toFixed(1)} nodes\n`);

// Run all four fingerprinting strategies
const results = new Map<string, SkeletonCluster[]>();

results.set(
  "Full Skeleton (type@depth sequence)",
  clusterByFingerprint(allFunctions, skeletonFingerprint, "full", minMembers, minDepth),
);

results.set(
  "Compressed (type sequence, ignoring depth)",
  clusterByFingerprint(allFunctions, compressedFingerprint, "compressed", minMembers, minDepth),
);

results.set(
  "Shape (unique type@depth pairs, unordered)",
  clusterByFingerprint(allFunctions, shapeFingerprint, "shape", minMembers, minDepth),
);

results.set(
  "Abbreviated (consecutive same-type collapsed)",
  clusterByFingerprint(allFunctions, abbreviatedFingerprint, "abbreviated", minMembers, minDepth),
);

// Summary stats
let totalClusters = 0;
for (const clusters of results.values()) totalClusters += clusters.length;
process.stderr.write(`Total clusters across all strategies: ${totalClusters}\n`);

process.stdout.write(formatResults(results, files.length, functionCount, parseTimeMs, top) + "\n");
