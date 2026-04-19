#!/usr/bin/env bun
// Cycle 6: Composite Multi-Signal Ranker
//
// PROBLEM: Five detectors exist (structural hash, n-gram, CFG skeleton, role naming,
// file template, type signature) but each produces isolated output. An engineer wants:
// "show me the top DRY opportunities, ranked by confidence across multiple signals."
//
// APPROACH: Score every function across 4 detection dimensions. Functions that light up
// on multiple dimensions are the highest-confidence duplication targets. Group them into
// actionable refactoring opportunities ranked by total signal strength.
//
// Usage: bun Tools/pattern-detector/variants/composite-ranker.ts <directory> [--top 30]

import { parseDirectory } from "@tools/pattern-detector/parse";
import { bodySimilarity } from "@tools/pattern-detector/similarity";
import type { ParsedFunction } from "@tools/pattern-detector/types";

// ─── Signal Dimensions ──────────────────────────────────────────────────────

type SignalType = "hash" | "name" | "signature" | "body";

interface FunctionSignals {
  fn: ParsedFunction;
  key: string;
  signals: Map<SignalType, SignalScore>;
  totalScore: number;
  dimensionCount: number;
}

interface SignalScore {
  signal: SignalType;
  score: number; // 0-1 normalized
  groupSize: number; // how many peers in this signal's group
  evidence: string; // human-readable evidence
}

// ─── Signal Extraction ──────────────────────────────────────────────────────

function fnKey(fn: ParsedFunction): string {
  return `${fn.file}:${fn.name}:${fn.line}`;
}

function extractHashSignal(allFns: ParsedFunction[]): Map<string, SignalScore> {
  const groups = new Map<string, ParsedFunction[]>();
  for (const fn of allFns) {
    const g = groups.get(fn.bodyHash);
    if (g) g.push(fn);
    else groups.set(fn.bodyHash, [fn]);
  }

  const scores = new Map<string, SignalScore>();
  for (const [_hash, fns] of groups) {
    const fileCount = new Set(fns.map((f) => f.file)).size;
    if (fns.length < 2 || fileCount < 2) continue;
    for (const fn of fns) {
      scores.set(fnKey(fn), {
        signal: "hash",
        score: 1.0,
        groupSize: fns.length,
        evidence: `Exact structural match with ${fns.length - 1} other function(s)`,
      });
    }
  }
  return scores;
}

function extractNameSignal(allFns: ParsedFunction[]): Map<string, SignalScore> {
  const groups = new Map<string, ParsedFunction[]>();
  for (const fn of allFns) {
    const g = groups.get(fn.name);
    if (g) g.push(fn);
    else groups.set(fn.name, [fn]);
  }

  const scores = new Map<string, SignalScore>();
  for (const [name, fns] of groups) {
    const fileCount = new Set(fns.map((f) => f.file)).size;
    if (fns.length < 2 || fileCount < 2) continue;
    // Score scales with instance count, capped at 1.0
    const score = Math.min(1.0, fns.length / 10);
    for (const fn of fns) {
      scores.set(fnKey(fn), {
        signal: "name",
        score,
        groupSize: fns.length,
        evidence: `"${name}" appears ${fns.length} times across ${fileCount} files`,
      });
    }
  }
  return scores;
}

function extractSignatureSignal(allFns: ParsedFunction[]): Map<string, SignalScore> {
  const groups = new Map<string, ParsedFunction[]>();
  for (const fn of allFns) {
    const paramTypes = fn.params.map((p) => p.typeAnnotation ?? "none").join(",");
    const sig = `(${paramTypes})→${fn.returnType ?? "void"}`;
    const g = groups.get(sig);
    if (g) g.push(fn);
    else groups.set(sig, [fn]);
  }

  const scores = new Map<string, SignalScore>();
  for (const [sig, fns] of groups) {
    const fileCount = new Set(fns.map((f) => f.file)).size;
    if (fns.length < 5 || fileCount < 3) continue;
    const score = Math.min(1.0, fns.length / 20);
    for (const fn of fns) {
      scores.set(fnKey(fn), {
        signal: "signature",
        score,
        groupSize: fns.length,
        evidence: `Type signature ${sig} shared by ${fns.length} functions`,
      });
    }
  }
  return scores;
}

function extractBodySignal(allFns: ParsedFunction[]): Map<string, SignalScore> {
  // Group by name first (cheap filter), then check body sim for different-named peers
  // This catches the "different name, similar body" case that name signal misses
  const scores = new Map<string, SignalScore>();

  // Sample: for each function, check body similarity against a random sample of others
  // with the same type signature (same approach as type-signature detector)
  const sigGroups = new Map<string, ParsedFunction[]>();
  for (const fn of allFns) {
    const paramTypes = fn.params.map((p) => p.typeAnnotation ?? "none").join(",");
    const sig = `${paramTypes}->${fn.returnType ?? "void"}`;
    const g = sigGroups.get(sig);
    if (g) g.push(fn);
    else sigGroups.set(sig, [fn]);
  }

  for (const [_, fns] of sigGroups) {
    if (fns.length < 3) continue;

    // Sample pairs within signature group
    const sampleSize = Math.min(fns.length, 30);
    for (let i = 0; i < sampleSize; i++) {
      let maxSim = 0;
      let bestPeer: ParsedFunction | null = null;
      for (let j = 0; j < Math.min(sampleSize, 10); j++) {
        if (i === j) continue;
        const jIdx = (i + j + 1) % fns.length;
        if (fns[i].file === fns[jIdx].file && fns[i].name === fns[jIdx].name) continue;
        const sim = bodySimilarity(fns[i], fns[jIdx]);
        if (sim > maxSim) {
          maxSim = sim;
          bestPeer = fns[jIdx];
        }
      }
      if (maxSim > 0.5 && bestPeer) {
        const key = fnKey(fns[i]);
        if (!scores.has(key) || scores.get(key)!.score < maxSim) {
          scores.set(key, {
            signal: "body",
            score: maxSim,
            groupSize: fns.length,
            evidence: `${(maxSim * 100).toFixed(0)}% body similarity with ${bestPeer.name} in ${bestPeer.file.replace(/.*maple-hooks\//, "")}`,
          });
        }
      }
    }
  }

  return scores;
}

// ─── Composite Scoring ──────────────────────────────────────────────────────

const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  hash: 1.0, // Highest confidence — exact match
  name: 0.7, // Strong signal — same architectural role
  signature: 0.4, // Moderate — same types, might be coincidence
  body: 0.8, // Strong — similar implementation
};

function buildCompositeScores(allFns: ParsedFunction[]): FunctionSignals[] {
  const hashScores = extractHashSignal(allFns);
  const nameScores = extractNameSignal(allFns);
  const sigScores = extractSignatureSignal(allFns);
  const bodyScores = extractBodySignal(allFns);

  const results: FunctionSignals[] = [];

  for (const fn of allFns) {
    const key = fnKey(fn);
    const signals = new Map<SignalType, SignalScore>();

    const hash = hashScores.get(key);
    const name = nameScores.get(key);
    const sig = sigScores.get(key);
    const body = bodyScores.get(key);

    if (hash) signals.set("hash", hash);
    if (name) signals.set("name", name);
    if (sig) signals.set("signature", sig);
    if (body) signals.set("body", body);

    if (signals.size === 0) continue;

    let totalScore = 0;
    for (const [type, score] of signals) {
      totalScore += score.score * SIGNAL_WEIGHTS[type];
    }

    results.push({
      fn,
      key,
      signals,
      totalScore,
      dimensionCount: signals.size,
    });
  }

  results.sort((a, b) => {
    if (b.dimensionCount !== a.dimensionCount) return b.dimensionCount - a.dimensionCount;
    return b.totalScore - a.totalScore;
  });

  return results;
}

// ─── Opportunity Grouping ───────────────────────────────────────────────────

interface RefactorOpportunity {
  rank: number;
  name: string;
  members: FunctionSignals[];
  avgDimensions: number;
  avgScore: number;
  topSignals: string[];
  estimatedSavings: number; // lines that could be deduplicated
}

function groupIntoOpportunities(scored: FunctionSignals[]): RefactorOpportunity[] {
  // Group by function name (primary), then by body hash (secondary for same-name)
  const groups = new Map<string, FunctionSignals[]>();
  for (const s of scored) {
    const key = s.fn.name;
    const g = groups.get(key);
    if (g) g.push(s);
    else groups.set(key, [s]);
  }

  const opportunities: RefactorOpportunity[] = [];
  let rank = 1;

  for (const [name, members] of groups) {
    const fileCount = new Set(members.map((m) => m.fn.file)).size;
    if (fileCount < 2) continue;

    const avgDims = members.reduce((s, m) => s + m.dimensionCount, 0) / members.length;
    const avgScore = members.reduce((s, m) => s + m.totalScore, 0) / members.length;

    // Collect all unique signals across members
    const signalSet = new Set<string>();
    for (const m of members) {
      for (const [type] of m.signals) signalSet.add(type);
    }

    // Estimate savings: avg body size * (members - 1)
    const avgBodySize = members.reduce((s, m) => s + m.fn.bodyNodeTypes.length, 0) / members.length;
    const estimatedSavings = Math.round(avgBodySize * 0.3 * (members.length - 1)); // rough: 30% of AST nodes ≈ lines

    opportunities.push({
      rank,
      name,
      members,
      avgDimensions: avgDims,
      avgScore: avgScore,
      topSignals: [...signalSet],
      estimatedSavings,
    });
    rank++;
  }

  opportunities.sort((a, b) => {
    // Sort by avg dimensions desc, then avg score desc, then member count desc
    if (Math.round(b.avgDimensions) !== Math.round(a.avgDimensions)) {
      return Math.round(b.avgDimensions) - Math.round(a.avgDimensions);
    }
    if (Math.abs(b.avgScore - a.avgScore) > 0.1) return b.avgScore - a.avgScore;
    return b.members.length - a.members.length;
  });

  // Re-rank after sorting
  for (let i = 0; i < opportunities.length; i++) {
    opportunities[i].rank = i + 1;
  }

  return opportunities;
}

// ─── Output ─────────────────────────────────────────────────────────────────

function shortenPath(filePath: string): string {
  const home = require("node:os").homedir() as string;
  if (filePath.startsWith(home)) return `~${filePath.slice(home.length)}`;
  return filePath;
}

function formatResults(
  scored: FunctionSignals[],
  opportunities: RefactorOpportunity[],
  fileCount: number,
  functionCount: number,
  parseTimeMs: number,
  top: number,
): string {
  const lines: string[] = [];

  lines.push("\nComposite Multi-Signal DRY Ranker (Cycle 6)");
  lines.push("═".repeat(46));
  lines.push(
    `Scanned: ${fileCount} files, ${functionCount} functions | Parse: ${parseTimeMs.toFixed(0)}ms`,
  );

  // Dimension distribution
  const dimDist = new Map<number, number>();
  for (const s of scored) {
    dimDist.set(s.dimensionCount, (dimDist.get(s.dimensionCount) ?? 0) + 1);
  }
  lines.push(`\n--- Signal Dimension Distribution ---`);
  lines.push(`Functions with detection signals: ${scored.length} / ${functionCount}`);
  for (const [d, count] of [...dimDist.entries()].sort((a, b) => b[0] - a[0])) {
    const bar = "█".repeat(Math.min(40, Math.round(count / 5)));
    lines.push(`  ${d} dimensions: ${String(count).padStart(4)} ${bar}`);
  }

  // Top refactoring opportunities
  lines.push(`\n--- Top Refactoring Opportunities (${opportunities.length} total) ---\n`);

  for (const opp of opportunities.slice(0, top)) {
    const fileCount = new Set(opp.members.map((m) => m.fn.file)).size;
    const dimBar =
      "●".repeat(Math.round(opp.avgDimensions)) + "○".repeat(4 - Math.round(opp.avgDimensions));
    lines.push(
      `  #${opp.rank} ${opp.name} [${dimBar}] — ${opp.members.length} instances across ${fileCount} files`,
    );
    lines.push(
      `     Signals: ${opp.topSignals.join(", ")} | Avg score: ${opp.avgScore.toFixed(2)} | Est. savings: ~${opp.estimatedSavings} AST nodes`,
    );

    // Show top 4 members with their signals
    for (const m of opp.members.slice(0, 4)) {
      const path = shortenPath(m.fn.file).replace(/.*maple-hooks\//, "");
      const sigs = [...m.signals.values()]
        .map((s) => `${s.signal}:${(s.score * 100).toFixed(0)}%`)
        .join(" ");
      lines.push(`     - ${path}:${m.fn.line} [${sigs}]`);
    }
    if (opp.members.length > 4) {
      lines.push(`     ... and ${opp.members.length - 4} more`);
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
    "Usage: bun Tools/pattern-detector/variants/composite-ranker.ts <directory> [--top 30]\n",
  );
  process.exit(1);
}

function getFlag(name: string, defaultVal: number): number {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < args.length) return parseFloat(args[idx + 1]);
  return defaultVal;
}

const top = getFlag("top", 30);

const parseStart = performance.now();
const files = parseDirectory(directory);
const parseTimeMs = performance.now() - parseStart;
const functionCount = files.reduce((s, f) => s + f.functions.length, 0);
const allFns = files.flatMap((f) => f.functions);

process.stderr.write(
  `Parsed ${files.length} files (${functionCount} functions) in ${parseTimeMs.toFixed(0)}ms\n`,
);

const detectStart = performance.now();
const scored = buildCompositeScores(allFns);
const opportunities = groupIntoOpportunities(scored);
const detectTimeMs = performance.now() - detectStart;

process.stderr.write(
  `Scored ${scored.length} functions, found ${opportunities.length} opportunities in ${detectTimeMs.toFixed(0)}ms\n`,
);

process.stdout.write(
  `${formatResults(scored, opportunities, files.length, functionCount, parseTimeMs, top)}\n`,
);
