import { assembleCluster } from "@tools/pattern-detector/detectors/layered-assembly";
import type { ScoredPair } from "@tools/pattern-detector/detectors/layered-clusters";
import { buildClusters } from "@tools/pattern-detector/detectors/layered-clusters";
import { pairScore } from "@tools/pattern-detector/detectors/layered-scoring";
import type { Cluster, ParsedFile } from "@tools/pattern-detector/types";

export function detectLayered(files: ParsedFile[], threshold = 0.4): Cluster[] {
  const allFunctions = files.flatMap((f) => f.functions);

  // Candidate generation: group by sorted import fingerprint
  const groups = new Map<string, typeof allFunctions>();
  for (const fn of allFunctions) {
    const fp = [...fn.imports].sort().join("|");
    if (!groups.has(fp)) groups.set(fp, []);
    groups.get(fp)!.push(fn);
  }

  // Body similarity filtering across candidate groups (>=2 members)
  const survivingPairs: ScoredPair[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const score = pairScore(group[i], group[j]);
        if (score >= threshold) survivingPairs.push([group[i], group[j], score]);
      }
    }
  }

  if (survivingPairs.length === 0) return [];

  // Rebuild clusters via union-find, then assemble Cluster objects
  const clusterMap = buildClusters(survivingPairs);
  const clusters: Cluster[] = [];
  for (const { members, scores } of clusterMap.values()) {
    const memberList = [...members];
    if (memberList.length >= 2) clusters.push(assembleCluster(memberList, scores, survivingPairs));
  }
  return clusters;
}
