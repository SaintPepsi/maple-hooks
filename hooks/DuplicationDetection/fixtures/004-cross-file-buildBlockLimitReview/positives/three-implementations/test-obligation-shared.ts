export function buildBlockLimitReview(
  kind: string,
  pendingFiles: string[],
  blockCount: number,
): string {
  const timestamp = new Date().toISOString();
  const fileList = pendingFiles.map((f) => `- ${f}`).join("\n");
  return `# ${kind} Obligation Review

**Generated:** ${timestamp}
**Block attempts:** ${blockCount}
**Outcome:** Session released after reaching block limit

## Unresolved Files

${fileList}

## What Happened

The ${kind} obligation enforcer blocked session end ${blockCount} times for the files above.
The AI addressed the concern but did not resolve the pending state.

## Action Items

- Review whether these files genuinely need attention
- If not, consider adding them to an exclusion list
`;
}
