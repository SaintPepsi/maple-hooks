// Body similarity utilities for the pattern duplication detector spike.
// Used by Detector C (layered detector). Pure math/logic — no I/O.

import type { ParsedFunction } from "@tools/pattern-detector/types";

const NESTING_NODE_TYPES = new Set([
  "IfStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "SwitchStatement",
  "TryStatement",
]);

/**
 * Count occurrences of each AST node type in fn.bodyNodeTypes.
 * Returns a frequency map: node type string → count.
 */
export function buildNodeTypeVector(fn: ParsedFunction): Map<string, number> {
  const freq = new Map<string, number>();
  for (const nodeType of fn.bodyNodeTypes) {
    freq.set(nodeType, (freq.get(nodeType) ?? 0) + 1);
  }
  return freq;
}

/**
 * Compute cosine similarity between two frequency vectors.
 * Returns 0 if either vector has zero magnitude.
 */
export function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>
): number {
  const keys = new Set([...a.keys(), ...b.keys()]);

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const key of keys) {
    const va = a.get(key) ?? 0;
    const vb = b.get(key) ?? 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }

  if (magA === 0 || magB === 0) return 0;

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Estimate structural nesting depth from bodyNodeTypes.
 * Counts total nesting node types as a proxy for depth.
 */
export function controlFlowDepth(fn: ParsedFunction): number {
  let depth = 0;
  for (const nodeType of fn.bodyNodeTypes) {
    if (NESTING_NODE_TYPES.has(nodeType)) {
      depth += 1;
    }
  }
  return depth;
}

/**
 * Combined body similarity score for two functions.
 * - Cosine similarity of node type vectors (weight: 0.6)
 * - Depth difference penalty (weight: 0.2)
 * - CallExpression overlap (weight: 0.2)
 * Returns a value clamped to [0, 1].
 */
export function bodySimilarity(a: ParsedFunction, b: ParsedFunction): number {
  const vecA = buildNodeTypeVector(a);
  const vecB = buildNodeTypeVector(b);

  const cosinePart = cosineSimilarity(vecA, vecB);

  const depthA = controlFlowDepth(a);
  const depthB = controlFlowDepth(b);
  const depthPart = 1 - Math.abs(depthA - depthB) / Math.max(depthA, depthB, 1);

  const callCountA = a.bodyNodeTypes.filter((t) => t === "CallExpression").length;
  const callCountB = b.bodyNodeTypes.filter((t) => t === "CallExpression").length;
  const callUnion = callCountA + callCountB;
  const callOverlapPart = callUnion === 0
    ? 1
    : (2 * Math.min(callCountA, callCountB)) / callUnion;

  const score = 0.6 * cosinePart + 0.2 * depthPart + 0.2 * callOverlapPart;

  return Math.min(1, Math.max(0, score));
}
