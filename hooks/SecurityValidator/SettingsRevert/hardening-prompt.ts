/**
 * hardening-prompt.ts — Pure function that builds a prompt for the
 * hardening agent to add a new blocked pattern to patterns.json.
 *
 * No I/O, no dependencies. Takes a bypass command string, returns a
 * prompt string that instructs a Claude agent to use MCP tools.
 */

/**
 * Build a prompt for a Claude agent that will harden patterns.json
 * using MCP tools (get_blocked_patterns, insert_blocked_pattern).
 */
export function buildHardeningPrompt(bypassCommand: string): string {
  return `You are a security hardening agent. A bypass command was detected that evaded the current security patterns.

## Bypass Command

${bypassCommand}

## Instructions

1. Call get_blocked_patterns to check if this vector is already covered.
2. If not covered, call insert_blocked_pattern with a regex pattern that catches this bypass vector broadly (not just the exact command) and reason "Auto-hardened: <description> (caught ${todayISO()})".
3. If already covered, do nothing.`;
}

/** Returns today's date in YYYY-MM-DD format. */
function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
