/**
 * Svelte Utilities — Script extraction and file classification for .svelte files.
 *
 * Used by guard hooks to analyze TypeScript code inside Svelte components.
 * Extracts `<script lang="ts">` blocks while preserving line numbers.
 */

// ─── File Classification ─────────────────────────────────────────────────────

/** Check if a file path is a Svelte component. */
export function isSvelteFile(filePath: string): boolean {
  return /\.svelte$/.test(filePath);
}

// ─── Script Block Extraction ─────────────────────────────────────────────────

/**
 * Extract the TypeScript script block from a Svelte file.
 *
 * Returns the content of `<script lang="ts">...</script>` with leading
 * empty lines to preserve line number alignment with the original file.
 * Returns null if no TypeScript script block is found.
 *
 * Handles:
 * - `<script lang="ts">` (standard)
 * - `<script lang='ts'>` (single quotes)
 * - `<script lang=ts>` (no quotes)
 * - Extra attributes in any order
 */
export function extractSvelteScript(content: string): string | null {
  // Match <script> tags with lang="ts" attribute
  const scriptPattern = /<script\b[^>]*\blang\s*=\s*["']?ts["']?[^>]*>([\s\S]*?)<\/script>/i;
  const match = content.match(scriptPattern);

  if (!match || match[1] === undefined) return null;

  const scriptContent = match[1];
  const scriptStartIndex = match.index!;

  // Count lines before the script content to preserve line numbers
  const beforeScript = content.slice(0, scriptStartIndex);
  const tagLine = content.slice(scriptStartIndex, scriptStartIndex + match[0].indexOf(">") + 1);
  const linesBeforeContent = (beforeScript + tagLine).split("\n").length - 1;

  // Pad with empty lines so line numbers match the original file
  const padding = "\n".repeat(linesBeforeContent);

  return padding + scriptContent;
}
