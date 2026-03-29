import type {
  Cluster,
  ClusterMember,
  ParamInfo,
  ParsedFile,
  ParsedFunction,
} from "@tools/pattern-detector/types";

/**
 * Detector A — Import Fingerprint
 *
 * Groups functions by the sorted set of imports they share, then scores each
 * group by how similar the parameter shapes are across members.
 *
 * Pure function — no side effects, no I/O.
 */

/** Stable fingerprint for a function: sorted import specifiers joined by "|". */
function fingerprint(fn: ParsedFunction): string {
  return [...fn.imports].sort().join("|");
}

/**
 * Pairwise parameter similarity in [0, 1].
 *
 * Similarity = matching params (same index + same typeAnnotation)
 *              divided by max(len(a), len(b)).
 *
 * Returns 1 when both functions have zero params (identical shape).
 */
function paramSimilarity(a: ParsedFunction, b: ParsedFunction): number {
  const maxLen = Math.max(a.params.length, b.params.length);
  if (maxLen === 0) return 1;

  const minLen = Math.min(a.params.length, b.params.length);
  let matching = 0;
  for (let i = 0; i < minLen; i++) {
    const pa: ParamInfo = a.params[i];
    const pb: ParamInfo = b.params[i];
    if (pa.typeAnnotation === pb.typeAnnotation) matching++;
  }
  return matching / maxLen;
}

/**
 * Average pairwise parameter similarity across all pairs in a group.
 * For a single-member group this would be 1 (caller discards those earlier).
 */
function groupParamSimilarity(members: ParsedFunction[]): number {
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      total += paramSimilarity(members[i], members[j]);
      pairs++;
    }
  }
  return pairs === 0 ? 1 : total / pairs;
}

/**
 * Confidence for a group.
 *
 *   confidence = (sharedImports / totalUniqueImports) * avgParamSimilarity
 *
 * totalUniqueImports is the size of the union of all import specifiers across
 * group members.
 */
function groupConfidence(members: ParsedFunction[], sharedImports: string[]): number {
  const union = new Set<string>();
  for (const fn of members) {
    for (const imp of fn.imports) union.add(imp);
  }
  const uniqueShared = new Set(sharedImports).size;
  const importScore = union.size === 0 ? 0 : Math.min(1, uniqueShared / union.size);
  return importScore * groupParamSimilarity(members);
}

export function detectImportFingerprint(files: ParsedFile[]): Cluster[] {
  // 1. Collect all functions across all files.
  const allFunctions: ParsedFunction[] = files.flatMap((f) => f.functions);

  // 2. Group by fingerprint — each key is the sorted import list joined by "|".
  const groups = new Map<string, ParsedFunction[]>();
  for (const fn of allFunctions) {
    const key = fingerprint(fn);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(fn);
    } else {
      groups.set(key, [fn]);
    }
  }

  // 3. Build clusters — discard groups with fewer than 2 members.
  const clusters: Cluster[] = [];

  for (const [key, members] of groups) {
    if (members.length < 2) continue;

    // Shared imports are the fingerprint tokens themselves — because every
    // member was bucketed by the same sorted-import key, the key tokens ARE
    // the shared imports.  The empty-string key means every member had no imports.
    const sharedImports = key === "" ? [] : key.split("|");

    // Cluster id: "import:" + first 8 hex chars of a djb2 hash of the key.
    let h = 5381;
    for (let i = 0; i < key.length; i++) {
      h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
    }
    const idSuffix = h.toString(16).padStart(8, "0").slice(0, 8);

    // Human-readable label from up to three shared module base-names.
    const labelNames = sharedImports
      .slice(0, 3)
      .map((s) => s.replace(/^.*\//, "").replace(/['"]/g, ""));
    const labelSuffix = sharedImports.length > 3 ? ` +${sharedImports.length - 3} more` : "";
    const label =
      labelNames.length === 0 ? "no-imports" : `shared:${labelNames.join("+")}${labelSuffix}`;

    const clusterMembers: ClusterMember[] = members.map((fn) => ({
      file: fn.file,
      functionName: fn.name,
      line: fn.line,
      evidence: sharedImports.map((imp) => `shared import: ${imp}`),
    }));

    clusters.push({
      id: `import:${idSuffix}`,
      detector: "import",
      label,
      confidence: groupConfidence(members, sharedImports),
      members: clusterMembers,
      reason: `${members.length} functions share ${sharedImports.length} import(s): ${sharedImports.slice(0, 3).join(", ")}${sharedImports.length > 3 ? "..." : ""}`,
    });
  }

  // Sort descending by confidence so callers see the strongest signals first.
  clusters.sort((a, b) => b.confidence - a.confidence);

  return clusters;
}
