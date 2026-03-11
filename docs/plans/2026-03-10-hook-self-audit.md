# Hook Self-Audit via Guard Hooks — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a script that runs every pai-hooks source file through our own guard hooks and writes a comprehensive audit report.

**Architecture:** Single TypeScript script (`scripts/self-audit.ts`) that imports the 3 pure analysis functions directly — no hook runner simulation needed. Globs target files, runs all 3 analyses per file, writes a structured markdown report to `MEMORY/LEARNING/QUALITY/`.

**Tech Stack:** TypeScript, bun, existing pure functions from `lib/coding-standards-checks.ts`, `contracts/TypeStrictness.ts`, and `core/quality-scorer.ts`.

---

### Task 1: Create the self-audit script skeleton

**Files:**
- Create: `scripts/self-audit.ts`

**Step 1: Write the file discovery logic**

This globs all non-test `.ts` files from `contracts/`, `lib/`, and `core/` (excluding `core/adapters/` since adapter files are legitimately exempt from coding standards).

```typescript
/**
 * Self-Audit Script — Run guard hooks against our own source files.
 *
 * Imports the pure analysis functions from our guard hooks and runs them
 * against every non-test source file in the codebase. Writes a markdown
 * report to MEMORY/LEARNING/QUALITY/.
 *
 * Usage: bun scripts/self-audit.ts
 */

import { readFileSync, readdirSync, statSync, mkdirSync } from "fs";
import { writeFileSync } from "fs";
import { join, relative } from "path";
import { findAllViolations, type Violation } from "@hooks/lib/coding-standards-checks";
import { findAnyViolations, type AnyViolation } from "@hooks/contracts/TypeStrictness";
import { scoreFile, formatAdvisory, type QualityScore } from "@hooks/core/quality-scorer";
import { getLanguageProfile, isScorableFile } from "@hooks/core/language-profiles";

// ─── Configuration ──────────────────────────────────────────────────────────

const BASE_DIR = import.meta.dir.replace(/\/scripts$/, "");
const REPORT_DIR = join(BASE_DIR, "..", "MEMORY", "LEARNING", "QUALITY");

const TARGET_DIRS = [
  join(BASE_DIR, "contracts"),
  join(BASE_DIR, "lib"),
  join(BASE_DIR, "core"),
];

const EXCLUDE_PATTERNS = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /\.coverage\.test\.ts$/,
  /\.integration\.test\.ts$/,
  /\/adapters\//,       // Adapters legitimately wrap builtins
  /\/node_modules\//,
];

// ─── File Discovery ─────────────────────────────────────────────────────────

function discoverFiles(dirs: string[]): string[] {
  const files: string[] = [];

  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".ts")) {
        const rel = relative(BASE_DIR, fullPath);
        const excluded = EXCLUDE_PATTERNS.some((p) => p.test(fullPath));
        if (!excluded) {
          files.push(fullPath);
        }
      }
    }
  }

  for (const dir of dirs) {
    try { walk(dir); } catch { /* dir may not exist */ }
  }

  return files.sort();
}
```

**Step 2: Run to verify it compiles**

```bash
cd ~/.claude/pai-hooks && bun scripts/self-audit.ts 2>&1 | head -5
```

Expected: No import errors (script runs but does nothing visible yet).

---

### Task 2: Add the analysis engine

**Files:**
- Modify: `scripts/self-audit.ts` (append after file discovery)

**Step 1: Add the analysis types and runner**

```typescript
// ─── Analysis Types ─────────────────────────────────────────────────────────

interface FileAudit {
  path: string;
  relativePath: string;
  codingStandards: Violation[];
  typeStrictness: { violations: AnyViolation[] };  // Renamed to avoid confusion with coding standards Violation
  qualityScore: QualityScore | null;  // null if not scorable
}

interface AuditSummary {
  totalFiles: number;
  filesWithViolations: number;
  cleanFiles: number;
  violationsByCategory: Record<string, number>;
  anyTypeViolations: number;
  averageQualityScore: number;
  lowestScoring: { path: string; score: number }[];
  highestScoring: { path: string; score: number }[];
}

// ─── Analysis Engine ────────────────────────────────────────────────────────

function analyzeFile(filePath: string): FileAudit {
  const content = readFileSync(filePath, "utf-8");
  const relativePath = relative(BASE_DIR, filePath);

  // 1. Coding standards violations (raw imports, try-catch, process.env, relative imports, etc.)
  const codingStandards = findAllViolations(content);

  // 2. TypeStrictness: any-type detection
  const anyViolations = findAnyViolations(content);

  // 3. Quality score (SOLID heuristics)
  let qualityScore: QualityScore | null = null;
  if (isScorableFile(filePath)) {
    const profile = getLanguageProfile(filePath);
    if (profile) {
      qualityScore = scoreFile(content, profile, filePath);
    }
  }

  return {
    path: filePath,
    relativePath,
    codingStandards,
    typeStrictness: { violations: anyViolations },
    qualityScore,
  };
}

function summarize(audits: FileAudit[]): AuditSummary {
  const violationsByCategory: Record<string, number> = {};
  let filesWithViolations = 0;
  let anyTypeTotal = 0;
  const scores: { path: string; score: number }[] = [];

  for (const audit of audits) {
    const hasIssues =
      audit.codingStandards.length > 0 ||
      audit.typeStrictness.violations.length > 0;

    if (hasIssues) filesWithViolations++;

    for (const v of audit.codingStandards) {
      violationsByCategory[v.category] = (violationsByCategory[v.category] || 0) + 1;
    }

    anyTypeTotal += audit.typeStrictness.violations.length;

    if (audit.qualityScore) {
      scores.push({ path: audit.relativePath, score: audit.qualityScore.score });
    }
  }

  scores.sort((a, b) => a.score - b.score);
  const avgScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
    : 0;

  return {
    totalFiles: audits.length,
    filesWithViolations,
    cleanFiles: audits.length - filesWithViolations,
    violationsByCategory,
    anyTypeViolations: anyTypeTotal,
    averageQualityScore: Math.round(avgScore * 10) / 10,
    lowestScoring: scores.slice(0, 5),
    highestScoring: scores.slice(-5).reverse(),
  };
}
```

**Step 2: Verify it compiles**

```bash
cd ~/.claude/pai-hooks && bun -e "import '@hooks/lib/coding-standards-checks'; console.log('ok')"
```

Expected: `ok`

---

### Task 3: Add the report generator

**Files:**
- Modify: `scripts/self-audit.ts` (append after analysis engine)

**Step 1: Add report formatting and main function**

```typescript
// ─── Report Generator ───────────────────────────────────────────────────────

function generateReport(audits: FileAudit[], summary: AuditSummary): string {
  const timestamp = new Date().toISOString();
  const lines: string[] = [];

  lines.push("# PAI Hooks Self-Audit Report");
  lines.push("");
  lines.push(`**Generated:** ${timestamp}`);
  lines.push(`**Files Scanned:** ${summary.totalFiles}`);
  lines.push(`**Files with Violations:** ${summary.filesWithViolations}`);
  lines.push(`**Clean Files:** ${summary.cleanFiles}`);
  lines.push(`**Average Quality Score:** ${summary.averageQualityScore}/10`);
  lines.push("");

  // ── Violation Summary ──
  lines.push("## Violation Summary by Category");
  lines.push("");
  lines.push("| Category | Count |");
  lines.push("|----------|-------|");
  for (const [category, count] of Object.entries(summary.violationsByCategory).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${category} | ${count} |`);
  }
  if (summary.anyTypeViolations > 0) {
    lines.push(`| any-type (TypeStrictness) | ${summary.anyTypeViolations} |`);
  }
  lines.push("");

  // ── Quality Scores ──
  lines.push("## Quality Scores");
  lines.push("");
  if (summary.lowestScoring.length > 0) {
    lines.push("### Lowest Scoring Files");
    lines.push("");
    lines.push("| File | Score |");
    lines.push("|------|-------|");
    for (const f of summary.lowestScoring) {
      lines.push(`| ${f.path} | ${f.score}/10 |`);
    }
    lines.push("");
  }
  if (summary.highestScoring.length > 0) {
    lines.push("### Highest Scoring Files");
    lines.push("");
    lines.push("| File | Score |");
    lines.push("|------|-------|");
    for (const f of summary.highestScoring) {
      lines.push(`| ${f.path} | ${f.score}/10 |`);
    }
    lines.push("");
  }

  // ── Per-File Detail ──
  lines.push("## Per-File Detail");
  lines.push("");

  for (const audit of audits) {
    const csCount = audit.codingStandards.length;
    const tsCount = audit.typeStrictness.violations.length;
    const score = audit.qualityScore?.score ?? "N/A";
    const totalIssues = csCount + tsCount;

    const icon = totalIssues === 0 ? "✅" : "⚠️";
    lines.push(`### ${icon} ${audit.relativePath}`);
    lines.push("");
    lines.push(`- **Quality Score:** ${score}/10`);
    lines.push(`- **Coding Standards Violations:** ${csCount}`);
    lines.push(`- **Type Strictness Violations:** ${tsCount}`);

    if (csCount > 0) {
      lines.push("");
      lines.push("**Coding Standards:**");
      for (const v of audit.codingStandards) {
        lines.push(`- Line ${v.line} [${v.category}]: ${v.content}`);
      }
    }

    if (tsCount > 0) {
      lines.push("");
      lines.push("**Type Strictness:**");
      for (const v of audit.typeStrictness.violations) {
        lines.push(`- Line ${v.line} [${v.pattern}]: ${v.content}`);
      }
    }

    if (audit.qualityScore && audit.qualityScore.violations.length > 0) {
      lines.push("");
      lines.push("**SOLID Violations:**");
      for (const v of audit.qualityScore.violations) {
        lines.push(`- [${v.category}/${v.severity}] ${v.check}: ${v.message}`);
      }
    }

    lines.push("");
  }

  // ── Patterns & Learnings ──
  lines.push("## Patterns & Learnings");
  lines.push("");

  const cats = Object.entries(summary.violationsByCategory).sort((a, b) => b[1] - a[1]);
  if (cats.length > 0) {
    lines.push(`**Most common violation:** ${cats[0][0]} (${cats[0][1]} instances)`);
    lines.push("");
    lines.push("**Key observations:**");
    lines.push("");

    if (summary.violationsByCategory["relative-import"]) {
      lines.push(`- **Relative imports** are the dominant issue (${summary.violationsByCategory["relative-import"]} instances). These files predate the @hooks/ path alias and were never migrated.`);
    }
    if (summary.violationsByCategory["try-catch"]) {
      lines.push(`- **Try-catch flow control** appears in ${summary.violationsByCategory["try-catch"]} files. These need Result<T> refactoring.`);
    }
    if (summary.violationsByCategory["process-env"]) {
      lines.push(`- **Direct process.env** access in ${summary.violationsByCategory["process-env"]} locations. Most are module-level BASE_DIR consts that feed defaultDeps -- structurally borderline.`);
    }
    if (summary.violationsByCategory["raw-import"]) {
      lines.push(`- **Raw Node builtins** in ${summary.violationsByCategory["raw-import"]} locations (likely \`homedir\` from "os").`);
    }
    if (summary.anyTypeViolations > 0) {
      lines.push(`- **\`any\` types** in ${summary.anyTypeViolations} locations. These need proper typing or \`unknown\`.`);
    }
  }

  lines.push("");
  lines.push("---");
  lines.push("*Auto-generated by scripts/self-audit.ts*");

  return lines.join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main(): void {
  console.log("🔍 PAI Hooks Self-Audit");
  console.log("=======================\n");

  const files = discoverFiles(TARGET_DIRS);
  console.log(`Found ${files.length} source files to audit.\n`);

  const audits = files.map((f) => {
    const audit = analyzeFile(f);
    const issues = audit.codingStandards.length + audit.typeStrictness.violations.length;
    const icon = issues === 0 ? "✅" : "⚠️";
    console.log(`${icon} ${audit.relativePath}: ${issues} violations, score ${audit.qualityScore?.score ?? "N/A"}/10`);
    return audit;
  });

  console.log("");

  const summary = summarize(audits);
  const report = generateReport(audits, summary);

  // Write report
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const yearMonth = dateStr.substring(0, 7);
  const reportDir = join(REPORT_DIR, yearMonth);
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, `self-audit-${dateStr}.md`);
  writeFileSync(reportPath, report);

  console.log(`\n📄 Report written to: ${reportPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Files scanned: ${summary.totalFiles}`);
  console.log(`   With violations: ${summary.filesWithViolations}`);
  console.log(`   Clean: ${summary.cleanFiles}`);
  console.log(`   Avg quality: ${summary.averageQualityScore}/10`);
  console.log(`   Top violation: ${Object.entries(summary.violationsByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none"}`);
}

main();
```

**Step 2: Run the audit**

```bash
cd ~/.claude/pai-hooks && bun scripts/self-audit.ts
```

Expected: Console output listing each file with violation count and quality score, plus a report file path.

**Step 3: Read the report and verify it's comprehensive**

```bash
cat ~/.claude/MEMORY/LEARNING/QUALITY/2026-03/self-audit-2026-03-10.md | head -40
```

Expected: Markdown report with summary tables and per-file detail.

**Step 4: Commit**

```bash
git add scripts/self-audit.ts
git commit -m "feat(hooks): add self-audit script to analyze hooks against own guard hooks"
```

---

### Task 4: Review findings and document learnings

**Files:**
- Read: The generated report in `MEMORY/LEARNING/QUALITY/2026-03/`

**Step 1: Read the full report**

Open the generated report and look for:
- Which violation category dominates (likely `relative-import`)
- Whether any files have quality scores below 6.0
- Whether the `process-env` pattern (module-level BASE_DIR → defaultDeps) should be explicitly exempted or refactored
- Whether TypeStrictness catches anything the coding standards checker misses

**Step 2: Document actionable learnings**

Write a brief analysis to the report's "Patterns & Learnings" section (the script auto-generates a starter, but refine it based on actual data).

Key questions to answer:
1. Are there files that ALL THREE guards flag? (These are the worst offenders to fix first)
2. Is the `process.env` pattern (const BASE_DIR feeding defaultDeps) a real problem or a false positive?
3. Should we add `"os"` to the raw-import patterns in `coding-standards-checks.ts`?
4. Do any files have `any` types that the TypeStrictness hook would block on Edit?

---

## Execution Notes

- **Run from:** `~/.claude/pai-hooks/` (so `@hooks/*` path alias resolves via tsconfig)
- **Runtime:** `bun` (not node -- bun handles tsconfig paths natively)
- **No deps to install:** All imports are from the existing codebase
- **Idempotent:** Can rerun anytime. Report filename includes date, so previous reports are preserved.
- **This script uses raw `fs` intentionally** -- it's a standalone analysis script, not a hook contract. The adapter pattern is for hook business logic, not for tooling scripts. Same pattern as the existing `scripts/export-hooks.ts` and `scripts/import-hooks.ts`.
