import type { ParsedFunction } from "@tools/pattern-detector/types";

export type ScoredPair = [ParsedFunction, ParsedFunction, number];
export type RawCluster = { members: Set<ParsedFunction>; scores: number[] };

function fnKey(fn: ParsedFunction): string {
  return `${fn.file}::${fn.name}::${fn.line}`;
}

function makeUnionFind() {
  const parent = new Map<string, string>();
  function find(k: string): string {
    if (!parent.has(k)) parent.set(k, k);
    const p = parent.get(k)!;
    if (p !== k) parent.set(k, find(p));
    return parent.get(k)!;
  }
  function union(ka: string, kb: string): void {
    const ra = find(ka);
    const rb = find(kb);
    if (ra !== rb) parent.set(rb, ra);
  }
  return { find, union };
}

export function buildClusters(pairs: ScoredPair[]): Map<string, RawCluster> {
  const uf = makeUnionFind();
  const scoreMap = new Map<string, number[]>();
  const fnByKey = new Map<string, ParsedFunction>();

  for (const [a, b, score] of pairs) {
    const ka = fnKey(a);
    const kb = fnKey(b);
    fnByKey.set(ka, a);
    fnByKey.set(kb, b);
    uf.find(ka);
    uf.find(kb);
    uf.union(ka, kb);
    const root = uf.find(ka);
    if (!scoreMap.has(root)) scoreMap.set(root, []);
    scoreMap.get(root)!.push(score);
  }

  const finalScores = new Map<string, number[]>();
  for (const [k, scores] of scoreMap) {
    const root = uf.find(k);
    if (!finalScores.has(root)) finalScores.set(root, []);
    finalScores.get(root)!.push(...scores);
  }

  const fnByRoot = new Map<string, Set<ParsedFunction>>();
  for (const [k, fn] of fnByKey) {
    const root = uf.find(k);
    if (!fnByRoot.has(root)) fnByRoot.set(root, new Set());
    fnByRoot.get(root)!.add(fn);
  }

  const result = new Map<string, RawCluster>();
  for (const [root, members] of fnByRoot) {
    result.set(root, { members, scores: finalScores.get(root) ?? [] });
  }
  return result;
}
