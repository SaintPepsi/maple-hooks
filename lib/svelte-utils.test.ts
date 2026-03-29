import { describe, expect, test } from "bun:test";
import { extractSvelteScript, isSvelteFile } from "@hooks/lib/svelte-utils";

describe("isSvelteFile", () => {
  test("returns true for .svelte files", () => {
    expect(isSvelteFile("/src/lib/components/Gallery.svelte")).toBe(true);
    expect(isSvelteFile("Component.svelte")).toBe(true);
  });

  test("returns false for non-svelte files", () => {
    expect(isSvelteFile("/src/lib/utils.ts")).toBe(false);
    expect(isSvelteFile("/src/lib/utils.tsx")).toBe(false);
    expect(isSvelteFile("/src/lib/utils.js")).toBe(false);
    expect(isSvelteFile("/src/svelte.config.js")).toBe(false);
  });
});

describe("extractSvelteScript", () => {
  test('extracts script block with lang="ts"', () => {
    const content = `<script lang="ts">
  let count = $state(0);
</script>

<p>{count}</p>`;

    const result = extractSvelteScript(content);
    expect(result).not.toBeNull();
    expect(result!).toContain("let count = $state(0);");
  });

  test("extracts script block with lang='ts' (single quotes)", () => {
    const content = `<script lang='ts'>
  let x = 1;
</script>`;

    const result = extractSvelteScript(content);
    expect(result).not.toBeNull();
    expect(result!).toContain("let x = 1;");
  });

  test("returns null for files without script blocks", () => {
    const content = `<p>Hello</p>
<style>
  p { color: red; }
</style>`;

    expect(extractSvelteScript(content)).toBeNull();
  });

  test('returns null for script blocks without lang="ts"', () => {
    const content = `<script>
  let count = 0;
</script>`;

    expect(extractSvelteScript(content)).toBeNull();
  });

  test("preserves line numbers via padding", () => {
    const content = `<!-- Comment line 1 -->
<!-- Comment line 2 -->
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>

<p>{count}</p>`;

    const result = extractSvelteScript(content);
    expect(result).not.toBeNull();
    // The script content starts on line 3 of the original file
    // so lines 1-2 should be empty padding (newlines)
    const lines = result!.split("\n");
    // Lines before the script content should be empty
    expect(lines[0]).toBe("");
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe("");
    // Script content starts at the correct offset
    expect(lines[3]).toContain("count = $state(0)");
  });

  test("handles script tag with extra attributes", () => {
    const content = `<script lang="ts" context="module">
  export const prerender = true;
</script>`;

    // context="module" with lang="ts" should still match
    const result = extractSvelteScript(content);
    expect(result).not.toBeNull();
    expect(result!).toContain("export const prerender = true;");
  });

  test("does not extract style blocks", () => {
    const content = `<script lang="ts">
  let x = 1;
</script>

<style>
  .foo { color: red; }
</style>`;

    const result = extractSvelteScript(content);
    expect(result).not.toBeNull();
    expect(result!).not.toContain(".foo");
    expect(result!).not.toContain("color: red");
  });

  test("does not extract HTML template", () => {
    const content = `<script lang="ts">
  let name = $state('world');
</script>

<h1>Hello {name}!</h1>
<div class="container">
  <p>Some HTML content</p>
</div>`;

    const result = extractSvelteScript(content);
    expect(result).not.toBeNull();
    expect(result!).not.toContain("<h1>");
    expect(result!).not.toContain("<div");
    expect(result!).not.toContain("<p>");
  });
});
