// Human-readable cluster output formatter for the pattern duplication detector.

import { getHomeDir } from "@tools/pattern-detector/adapters";
import type { Cluster } from "@tools/pattern-detector/types";

export interface FormatDeps {
  homeDir: string;
}

const defaultFormatDeps: FormatDeps = {
  homeDir: getHomeDir(),
};

function shortenPath(filePath: string, homeDir: string): string {
  if (homeDir && filePath.startsWith(homeDir)) return `~${filePath.slice(homeDir.length)}`;
  return filePath;
}

function formatCluster(cluster: Cluster, index: number, homeDir: string): string {
  const lines: string[] = [];
  lines.push(`  ${index + 1}. ${cluster.label}`);
  lines.push(`     ID: ${cluster.id} | Confidence: ${(cluster.confidence * 100).toFixed(0)}%`);
  lines.push(`     Reason: ${cluster.reason}`);
  lines.push(`     Members:`);

  for (const member of cluster.members) {
    lines.push(
      `       - ${member.functionName} (${shortenPath(member.file, homeDir)}:${member.line})`,
    );
    if (member.evidence.length > 0) {
      lines.push(`         Evidence: ${member.evidence.join("; ")}`);
    }
  }

  return lines.join("\n");
}

function detectorLabel(detector: string): string {
  switch (detector) {
    case "import":
      return "Detector A: Import + Signature Fingerprinting";
    case "structural":
      return "Detector B: Structural Hash Bucketing";
    case "layered":
      return "Detector C: Layered (Import + Body Similarity)";
    default:
      return `Detector: ${detector}`;
  }
}

export function formatClusters(clusters: Cluster[], deps: FormatDeps = defaultFormatDeps): string {
  if (clusters.length === 0) return "  No clusters detected.\n";

  const grouped = new Map<string, Cluster[]>();
  for (const c of clusters) {
    const existing = grouped.get(c.detector);
    if (existing) existing.push(c);
    else grouped.set(c.detector, [c]);
  }

  const sections: string[] = [];

  for (const [detector, detectorClusters] of grouped) {
    const header = detectorLabel(detector);
    sections.push(`\n${header}`);
    sections.push(`${"─".repeat(header.length)}`);
    sections.push(`Found ${detectorClusters.length} cluster(s):\n`);

    for (let i = 0; i < detectorClusters.length; i++) {
      sections.push(formatCluster(detectorClusters[i], i, deps.homeDir));
      sections.push("");
    }
  }

  return sections.join("\n");
}

export function formatSummary(
  clusters: Cluster[],
  parseTimeMs: number,
  fileCount: number,
  functionCount: number,
): string {
  const lines: string[] = [];
  lines.push("\nPattern Duplication Detector — Results");
  lines.push("═".repeat(40));
  lines.push(`Scanned: ${fileCount} files, ${functionCount} functions`);
  lines.push(`Parse time: ${parseTimeMs.toFixed(0)}ms`);
  lines.push(`Total clusters: ${clusters.length}`);

  const byDetector = new Map<string, number>();
  for (const c of clusters) {
    byDetector.set(c.detector, (byDetector.get(c.detector) ?? 0) + 1);
  }
  for (const [det, count] of byDetector) {
    lines.push(`  ${detectorLabel(det)}: ${count} cluster(s)`);
  }

  return lines.join("\n");
}
