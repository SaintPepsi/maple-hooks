import { describe, it, expect } from "bun:test";
import { markdownToHtml, renderHookPage, renderGroupPage, renderIndexPage } from "./template";
import type { HookMeta, GroupMeta } from "./template";

// ─── markdownToHtml ───────────────────────────────────────────────────────────

describe("markdownToHtml", () => {
  it("converts h2 headings to section-label + h2", () => {
    const html = markdownToHtml("## Overview");
    expect(html).toContain("section-label");
    expect(html).toContain("<h2");
  });

  it("converts h3 headings normally", () => {
    expect(markdownToHtml("### Details")).toContain("<h3");
  });

  it("adds id attributes to headings", () => {
    const html = markdownToHtml("## When It Fires");
    expect(html).toContain('id="when-it-fires"');
  });

  it("converts paragraphs", () => {
    expect(markdownToHtml("Hello world")).toContain("<p>Hello world</p>");
  });

  it("converts inline code", () => {
    expect(markdownToHtml("Use `foo()` here")).toContain("<code>foo()</code>");
  });

  it("converts bold text", () => {
    expect(markdownToHtml("This is **bold**")).toContain("<strong>bold</strong>");
  });

  it("converts italic text", () => {
    expect(markdownToHtml("This is *italic*")).toContain("<em>italic</em>");
  });

  it("converts links", () => {
    const html = markdownToHtml("[click](http://example.com)");
    expect(html).toContain('<a href="http://example.com">click</a>');
  });

  it("converts fenced code blocks to .code-block", () => {
    const md = "```typescript\nconst x = 1;\n```";
    const html = markdownToHtml(md);
    expect(html).toContain("code-block");
    expect(html).toContain("const x = 1;");
  });

  it("adds code-lang tag for language", () => {
    const md = "```typescript\nconst x = 1;\n```";
    const html = markdownToHtml(md);
    expect(html).toContain("code-lang");
    expect(html).toContain("typescript");
  });

  it("escapes HTML in code blocks", () => {
    const md = "```\n<div>&</div>\n```";
    const html = markdownToHtml(md);
    expect(html).toContain("&lt;div&gt;");
    expect(html).toContain("&amp;");
  });

  it("converts unordered lists", () => {
    const md = "- item one\n- item two";
    const html = markdownToHtml(md);
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>item one</li>");
    expect(html).toContain("<li>item two</li>");
  });

  it("converts ordered lists", () => {
    const md = "1. first\n2. second";
    const html = markdownToHtml(md);
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>first</li>");
  });

  it("converts blockquotes to .insight callouts", () => {
    const html = markdownToHtml("> quoted text");
    expect(html).toContain("insight");
    expect(html).toContain("quoted text");
  });

  it("converts tables to .tbl", () => {
    const md = "| Name | Type |\n| --- | --- |\n| foo | bar |";
    const html = markdownToHtml(md);
    expect(html).toContain('class="tbl"');
    expect(html).toContain("<th>Name</th>");
    expect(html).toContain("<td>foo</td>");
  });
});

// ─── renderHookPage ───────────────────────────────────────────────────────────

describe("renderHookPage", () => {
  const hook: HookMeta = { name: "TestHook", group: "TestGroup", event: "PostToolUse", description: "A test hook" };

  it("produces valid HTML", () => {
    const html = renderHookPage(hook, "## Overview\nHello", "TestGroup");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  it("includes hero section with hook name", () => {
    const html = renderHookPage(hook, "## Overview\nHello", "TestGroup");
    expect(html).toContain('class="hero"');
    expect(html).toContain("<h1>TestHook</h1>");
  });

  it("includes event tag with correct color", () => {
    const html = renderHookPage(hook, "## Overview\nHello", "TestGroup");
    expect(html).toContain("tag blue"); // PostToolUse = blue
    expect(html).toContain("PostToolUse");
  });

  it("includes group tag", () => {
    const html = renderHookPage(hook, "## Overview\nHello", "TestGroup");
    expect(html).toContain("tag green");
    expect(html).toContain("TestGroup");
  });

  it("renders markdown content", () => {
    const html = renderHookPage(hook, "## Overview\nThis hook does things.", "TestGroup");
    expect(html).toContain("section-label");
    expect(html).toContain("This hook does things.");
  });

  it("inlines CSS from framework", () => {
    const html = renderHookPage(hook, "## Overview\nHello", "TestGroup");
    expect(html).toContain("<style>");
    expect(html).toContain("--bg:");
  });

  it("includes hero-badge and hero-meta", () => {
    const html = renderHookPage(hook, "## Overview\nHello", "TestGroup");
    expect(html).toContain("hero-badge");
    expect(html).toContain("hero-meta");
  });

  it("builds sidebar when enough headings", () => {
    const md = "## Overview\n\n## Event\n\n## When It Fires\n\n## What It Does";
    const html = renderHookPage(hook, md, "TestGroup");
    expect(html).toContain("wiki-nav");
    expect(html).toContain("has-sidebar");
  });

  it("omits sidebar for short docs", () => {
    const html = renderHookPage(hook, "## Overview\nShort doc.", "TestGroup");
    expect(html).not.toContain('id="wikiNav"');
    // Body tag should NOT have has-sidebar class (CSS contains the string, so check the tag)
    const bodyTag = html.match(/<body[^>]*>/)?.[0] ?? "";
    expect(bodyTag).not.toContain("has-sidebar");
  });
});

// ─── renderGroupPage ─────────────────────────────────────────────────────────

describe("renderGroupPage", () => {
  const group: GroupMeta = {
    name: "TestGroup",
    description: "A test group",
    hooks: [
      { name: "HookA", group: "TestGroup", event: "PreToolUse", description: "First hook" },
      { name: "HookB", group: "TestGroup", event: "Stop", description: "Second hook" },
    ],
  };

  it("produces valid HTML with hero", () => {
    const html = renderGroupPage(group);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('class="hero"');
  });

  it("lists all hooks as cards", () => {
    const html = renderGroupPage(group);
    expect(html).toContain("HookA");
    expect(html).toContain("HookB");
  });

  it("includes event badges on cards", () => {
    const html = renderGroupPage(group);
    expect(html).toContain("PreToolUse");
    expect(html).toContain("Stop");
  });

  it("links to hook pages via onclick", () => {
    const html = renderGroupPage(group);
    expect(html).toContain("HookA.html");
    expect(html).toContain("HookB.html");
  });

  it("includes summary grid with event counts", () => {
    const html = renderGroupPage(group);
    expect(html).toContain("summary-grid");
  });
});

// ─── renderIndexPage ─────────────────────────────────────────────────────────

describe("renderIndexPage", () => {
  const groups: GroupMeta[] = [
    { name: "GroupA", description: "First", hooks: [{ name: "H1", group: "GroupA", event: "Stop", description: "" }] },
    { name: "GroupB", description: "", hooks: [] },
  ];

  it("produces valid HTML with hero", () => {
    const html = renderIndexPage(groups);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('class="hero"');
  });

  it("includes summary grid with totals", () => {
    const html = renderIndexPage(groups);
    expect(html).toContain("summary-grid");
  });

  it("links to group pages", () => {
    const html = renderIndexPage(groups);
    expect(html).toContain("groups/GroupA/index.html");
    expect(html).toContain("groups/GroupB/index.html");
  });

  it("renders groups as cards", () => {
    const html = renderIndexPage(groups);
    expect(html).toContain("card accent");
    expect(html).toContain("GroupA");
    expect(html).toContain("GroupB");
  });
});
