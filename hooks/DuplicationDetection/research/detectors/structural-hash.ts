import type {
  Cluster,
  ClusterMember,
  ParsedFile,
  ParsedFunction,
} from "@tools/pattern-detector/types";

export function detectStructuralHash(files: ParsedFile[]): Cluster[] {
  const allFunctions: ParsedFunction[] = files.flatMap((f) => f.functions);

  const groups = new Map<string, ParsedFunction[]>();
  for (const fn of allFunctions) {
    const existing = groups.get(fn.bodyHash);
    if (existing) {
      existing.push(fn);
    } else {
      groups.set(fn.bodyHash, [fn]);
    }
  }

  const clusters: Cluster[] = [];

  for (const [bodyHash, members] of groups) {
    if (members.length < 2) continue;

    const names = members.map((m) => m.name).join(", ");

    const clusterMembers: ClusterMember[] = members.map((m) => ({
      file: m.file,
      functionName: m.name,
      line: m.line,
      evidence: ["Identical normalized AST structure"],
    }));

    clusters.push({
      id: `structural:${bodyHash}`,
      detector: "structural",
      label: `Structural match: ${names}`,
      confidence: 1.0,
      members: clusterMembers,
      reason: `${members.length} functions share the same normalized AST structure (bodyHash: ${bodyHash})`,
    });
  }

  return clusters;
}
