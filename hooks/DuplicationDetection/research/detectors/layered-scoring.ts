import { bodySimilarity } from "@tools/pattern-detector/similarity";
import type { ParsedFunction } from "@tools/pattern-detector/types";

export function importOverlap(a: ParsedFunction, b: ParsedFunction): number {
  const setA = new Set(a.imports);
  const setB = new Set(b.imports);
  const shared = [...setA].filter((imp) => setB.has(imp)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 1 : shared / union;
}

export function pairScore(a: ParsedFunction, b: ParsedFunction): number {
  return importOverlap(a, b) * bodySimilarity(a, b);
}

export function intersectImports(fns: ParsedFunction[]): string[] {
  if (fns.length === 0) return [];
  const sets = fns.map((f) => new Set(f.imports));
  return [...sets[0]].filter((imp) => sets.every((s) => s.has(imp)));
}

export function avg(nums: number[]): number {
  return nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;
}
