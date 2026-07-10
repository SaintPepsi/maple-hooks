export function buildBlockLimitReview(pendingFiles: string[], blockCount: number): string {
  const timestamp = new Date().toISOString();
  const fileList = pendingFiles.map((f) => `- ${f}`).join("\n");
  return `# Doc Obligation Review

**Generated:** ${timestamp}
**Block attempts:** ${blockCount}
**Outcome:** Session released after reaching block limit

## Unresolved Files

${fileList}

## What Happened

The doc obligation enforcer blocked session end ${blockCount} times for the files above.
The AI addressed the concern but did not resolve the pending state (likely because the files
are already documented elsewhere or the obligation was a false positive).

## Action Items

- Review whether these files genuinely need documentation updates
- If not, consider adding them to an exclusion list
`;
}
