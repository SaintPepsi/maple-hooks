#!/usr/bin/env bun
// CLI entry point for the pattern duplication detector spike.
// Usage: bun Tools/pattern-detector/index.ts <directory> [--detector import|structural|layered] [--threshold 0.4] [--json]

import { parseDirectory } from "@tools/pattern-detector/parse";
import { detectImportFingerprint } from "@tools/pattern-detector/detectors/import-fingerprint";
import { detectStructuralHash } from "@tools/pattern-detector/detectors/structural-hash";
import { detectLayered } from "@tools/pattern-detector/detectors/layered";
import { formatClusters, formatSummary } from "@tools/pattern-detector/format";
import type { Cluster, ParsedFile } from "@tools/pattern-detector/types";

// ─── Arg Parsing ────────────────────────────────────────────────────────────

interface CliArgs {
  directory: string;
  detector: "import" | "structural" | "layered" | "all";
  threshold: number;
  json: boolean;
}

function parseArgs(argv: string[]): CliArgs | null {
  const args = argv.slice(2);
  if (args.length === 0) return null;

  const result: CliArgs = {
    directory: "",
    detector: "all",
    threshold: 0.4,
    json: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--detector" && i + 1 < args.length) {
      const val = args[i + 1];
      if (val === "import" || val === "structural" || val === "layered" || val === "all") {
        result.detector = val;
      } else {
        process.stderr.write(`Unknown detector: ${val}. Use import, structural, layered, or all.\n`);
        return null;
      }
      i += 2;
    } else if (arg === "--threshold" && i + 1 < args.length) {
      result.threshold = parseFloat(args[i + 1]);
      i += 2;
    } else if (arg === "--json") {
      result.json = true;
      i += 1;
    } else if (!arg.startsWith("--") && result.directory === "") {
      result.directory = arg;
      i += 1;
    } else {
      process.stderr.write(`Unknown argument: ${arg}\n`);
      return null;
    }
  }

  if (result.directory === "") return null;
  return result;
}

// ─── Detector Runner ────────────────────────────────────────────────────────

function runDetectors(files: ParsedFile[], detector: CliArgs["detector"], threshold: number): Cluster[] {
  const clusters: Cluster[] = [];

  if (detector === "all" || detector === "import") {
    clusters.push(...detectImportFingerprint(files));
  }
  if (detector === "all" || detector === "structural") {
    clusters.push(...detectStructuralHash(files));
  }
  if (detector === "all" || detector === "layered") {
    clusters.push(...detectLayered(files, threshold));
  }

  return clusters;
}

// ─── Main ───────────────────────────────────────────────────────────────────

const cliArgs = parseArgs(process.argv);

if (!cliArgs) {
  process.stderr.write(
    "Usage: bun Tools/pattern-detector/index.ts <directory> [--detector import|structural|layered|all] [--threshold 0.4] [--json]\n",
  );
  process.exit(1);
}

const parseStart = performance.now();
const files = parseDirectory(cliArgs.directory);
const parseTimeMs = performance.now() - parseStart;

const functionCount = files.reduce((sum, f) => sum + f.functions.length, 0);

process.stderr.write(`Parsed ${files.length} files (${functionCount} functions) in ${parseTimeMs.toFixed(0)}ms\n`);

const clusters = runDetectors(files, cliArgs.detector, cliArgs.threshold);

if (cliArgs.json) {
  process.stdout.write(JSON.stringify(clusters, null, 2) + "\n");
} else {
  process.stdout.write(formatSummary(clusters, parseTimeMs, files.length, functionCount) + "\n");
  process.stdout.write(formatClusters(clusters) + "\n");
}
