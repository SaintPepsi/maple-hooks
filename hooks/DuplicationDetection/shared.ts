/**
 * Shared types and logic for the DuplicationDetection hook group.
 *
 * Contains: index types, index loading/caching, fingerprint similarity,
 * duplication checking, and output formatting.
 *
 * Parsing logic lives in parser.ts (separate concern).
 */

import type { ExtractedFunction } from "@hooks/hooks/DuplicationDetection/parser";

// ─── Index Types ────────────────────────────────────────────────────────────

export interface IndexEntry {
  f: string;
  n: string;
  l: number;
  h: string;
  p: string;
  r: string;
  fp: string;
  s: number;
}

export interface DuplicationIndex {
  version: number;
  root: string;
  builtAt: string;
  fileCount: number;
  functionCount: number;
  entries: IndexEntry[];
  hashGroups: [string, number[]][];
  nameGroups: [string, number[]][];
  sigGroups: [string, number[]][];
}

export interface DuplicationMatch {
  functionName: string;
  line: number;
  targetFile: string;
  targetName: string;
  targetLine: number;
  signals: string[];
  topScore: number;
}

// ─── Deps ───────────────────────────────────────────────────────────────────

export interface SharedDeps {
  readFile: (path: string) => string | null;
  exists: (path: string) => boolean;
}

// ─── Index Loading ──────────────────────────────────────────────────────────

let cachedIndex: DuplicationIndex | null = null;
let cachedIndexPath: string | null = null;

export function loadIndex(indexPath: string, deps: SharedDeps): DuplicationIndex | null {
  if (cachedIndex && cachedIndexPath === indexPath) return cachedIndex;
  const content = deps.readFile(indexPath);
  if (!content) return null;
  const parsed = JSON.parse(content) as DuplicationIndex;
  if (!parsed.version || !parsed.entries) return null;
  cachedIndex = parsed;
  cachedIndexPath = indexPath;
  return parsed;
}

export function clearIndexCache(): void {
  cachedIndex = null;
  cachedIndexPath = null;
}

export function findIndexPath(filePath: string, deps: SharedDeps): string | null {
  const { dirname, join } = require("path");
  let dir = dirname(filePath) as string;
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, ".duplication-index.json") as string;
    if (deps.exists(candidate)) return candidate;
    const parent = dirname(dir) as string;
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// ─── Fingerprint Similarity ─────────────────────────────────────────────────

export function fingerprintSimilarity(a: string, b: string): number {
  if (a.length !== 32 || b.length !== 32) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < 16; i++) {
    const va = parseInt(a.slice(i * 2, i * 2 + 2), 16);
    const vb = parseInt(b.slice(i * 2, i * 2 + 2), 16);
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Checking Logic ─────────────────────────────────────────────────────────

const DIMENSION_THRESHOLD = 3;
const FINGERPRINT_THRESHOLD = 0.5;
const MAX_FINDINGS = 3;

export function checkFunctions(
  functions: ExtractedFunction[],
  index: DuplicationIndex,
  filePath: string,
): DuplicationMatch[] {
  const hashMap = new Map(index.hashGroups);
  const nameMap = new Map(index.nameGroups);
  const sigMap = new Map(index.sigGroups);
  const matches: DuplicationMatch[] = [];

  for (const fn of functions) {
    const signals: string[] = [];
    let bestTarget: { file: string; name: string; line: number } | null = null;
    let topScore = 0;

    const hashPeers = hashMap.get(fn.bodyHash);
    if (hashPeers) {
      for (const idx of hashPeers) {
        const peer = index.entries[idx];
        if (peer.f === filePath) continue;
        signals.push("hash");
        bestTarget = { file: peer.f, name: peer.n, line: peer.l };
        topScore = 1.0;
        break;
      }
    }

    const namePeers = nameMap.get(fn.name);
    if (namePeers && namePeers.length >= 3) {
      signals.push("name");
      if (!bestTarget) {
        const peer = index.entries[namePeers[0]];
        bestTarget = { file: peer.f, name: peer.n, line: peer.l };
      }
      topScore = Math.max(topScore, Math.min(1.0, namePeers.length / 10));
    }

    const sig = `(${fn.paramSig})→${fn.returnType}`;
    const sigPeers = sigMap.get(sig);
    if (sigPeers && sigPeers.length >= 3) {
      signals.push("sig");
      for (const idx of sigPeers) {
        const peer = index.entries[idx];
        if (peer.f === filePath) continue;
        const sim = fingerprintSimilarity(fn.fingerprint, peer.fp);
        if (sim >= FINGERPRINT_THRESHOLD) {
          signals.push("body");
          if (sim > topScore) {
            topScore = sim;
            bestTarget = { file: peer.f, name: peer.n, line: peer.l };
          }
          break;
        }
      }
    }

    if (signals.length >= DIMENSION_THRESHOLD && bestTarget) {
      matches.push({
        functionName: fn.name,
        line: fn.line,
        targetFile: bestTarget.file,
        targetName: bestTarget.name,
        targetLine: bestTarget.line,
        signals,
        topScore,
      });
    }
  }

  return matches.slice(0, MAX_FINDINGS);
}

// ─── Output Formatting ──────────────────────────────────────────────────────

export const STALENESS_SECONDS = 300;

export function formatMatch(m: DuplicationMatch): string {
  const sigStr = m.signals.join("+");
  const score = (m.topScore * 100).toFixed(0);
  return `Similar: ${m.functionName} → ${m.targetFile}:${m.targetName} (${sigStr}, ${score}%)`;
}

export function formatFindings(matches: DuplicationMatch[], stale: boolean): string {
  const prefix = stale ? "stale: " : "";
  return matches.map((m) => `${prefix}${formatMatch(m)}`).join("\n");
}
