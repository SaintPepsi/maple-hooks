import type { Cluster, ClusterMember, ParsedFunction } from "@tools/pattern-detector/types";
import { avg, intersectImports } from "@tools/pattern-detector/detectors/layered-scoring";
import type { ScoredPair } from "@tools/pattern-detector/detectors/layered-clusters";

function memberHash(fns: ParsedFunction[]): string {
  const names = fns.map((f) => `${f.file}:${f.name}`).sort().join(",");
  let h = 0;
  for (let i = 0; i < names.length; i++) h = (Math.imul(31, h) + names.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16);
}

function sharedLabel(shared: string[]): string {
  if (shared.length === 0) return "overlapping imports";
  const preview = shared.slice(0, 3).join(", ");
  return shared.length > 3 ? `${preview} +${shared.length - 3} more` : preview;
}

function buildMember(
  fn: ParsedFunction,
  peers: ParsedFunction[],
  pairs: ScoredPair[],
  fallback: number,
): ClusterMember {
  const scores = pairs.filter(([a, b]) => a === fn || b === fn).map(([, , s]) => s);
  const score = scores.length > 0 ? avg(scores) : fallback;
  const shared = intersectImports([fn, ...peers]);
  const overlapNote = shared.length > 0
    ? `import overlap: ${sharedLabel(shared)}`
    : "import overlap: none";
  return {
    file: fn.file,
    functionName: fn.name,
    line: fn.line,
    evidence: [overlapNote, `body similarity score: ${score.toFixed(3)}`],
  };
}

export function assembleCluster(
  memberList: ParsedFunction[],
  scores: number[],
  pairs: ScoredPair[],
): Cluster {
  const confidence = avg(scores);
  const shared = intersectImports(memberList);
  return {
    id: `layered:${memberHash(memberList)}`,
    detector: "layered",
    label: `Functions sharing imports (${sharedLabel(shared)}) with body similarity ${(confidence * 100).toFixed(0)}%`,
    confidence,
    members: memberList.map((fn) =>
      buildMember(fn, memberList.filter((m) => m !== fn), pairs, confidence),
    ),
    reason: `${memberList.length} functions share import patterns and similar body structure (avg score ${confidence.toFixed(3)})`,
  };
}
