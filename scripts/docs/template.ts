/**
 * Hook Documentation HTML Templates — Agent Design Framework.
 *
 * Generates HTML using the agent-html-design-framework component vocabulary:
 * hero sections, colored cards, section-labels, tags, wiki sidebar, flow steps,
 * code windows, tables, and insight callouts.
 *
 * Pure functions that take structured data and return HTML strings.
 * No I/O — rendering only.
 */

import { readFileSync } from "fs";
import { join } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HookMeta {
  name: string;
  group: string;
  event: string;
  description: string;
}

export interface GroupMeta {
  name: string;
  description: string;
  hooks: HookMeta[];
}

// ─── CSS Loader ───────────────────────────────────────────────────────────────

let cachedCSS: string | null = null;

function getCSS(): string {
  if (!cachedCSS) {
    cachedCSS = readFileSync(join(import.meta.dir, "style.css"), "utf-8");
  }
  return cachedCSS;
}

// ─── Event → Color Mapping ────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  PreToolUse: "orange",
  PostToolUse: "blue",
  SessionStart: "green",
  SessionEnd: "cyan",
  UserPromptSubmit: "accent",
  PreCompact: "pink",
  Stop: "red",
  SubagentStart: "maple",
  SubagentStop: "maple",
};

function eventColor(event: string): string {
  return EVENT_COLORS[event] ?? "accent";
}

// ─── Markdown → HTML (framework-aware) ────────────────────────────────────────

/**
 * Convert markdown to HTML using framework component classes.
 * Handles: headings, paragraphs, code blocks, inline code, bold, italic,
 * unordered/ordered lists, blockquotes, tables, and links.
 */
export function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let inList: "ul" | "ol" | null = null;
  let inBlockquote = false;
  let inTable = false;
  let tableHeaderDone = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code blocks → .code-block with optional .code-lang
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        html.push("</div>");
        inCodeBlock = false;
        codeBlockLang = "";
      } else {
        closeOpenBlocks();
        codeBlockLang = line.slice(3).trim();
        const langTag = codeBlockLang
          ? `<span class="code-lang">${escapeHtml(codeBlockLang)}</span>`
          : "";
        html.push(`<div class="code-block">${langTag}`);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      html.push(escapeHtml(line));
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      closeOpenBlocks();
      continue;
    }

    // Table rows → .tbl
    if (line.includes("|") && line.trim().startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());

      if (cells.every((c) => /^[-:]+$/.test(c))) {
        tableHeaderDone = true;
        continue;
      }

      if (!inTable) {
        closeOpenBlocks();
        html.push('<table class="tbl">');
        inTable = true;
        tableHeaderDone = false;
      }

      const tag = !tableHeaderDone ? "th" : "td";
      html.push("<tr>" + cells.map((c) => `<${tag}>${inlineMarkdown(c)}</${tag}>`).join("") + "</tr>");
      continue;
    }

    if (inTable) {
      html.push("</table>");
      inTable = false;
      tableHeaderDone = false;
    }

    // Headings → section-label + heading
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeOpenBlocks();
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (level === 2) {
        html.push(`<div class="section-label">${escapeHtml(text)}</div>`);
        html.push(`<h2 id="${id}">${inlineMarkdown(text)}</h2>`);
      } else {
        html.push(`<h${level} id="${id}">${inlineMarkdown(text)}</h${level}>`);
      }
      continue;
    }

    // Blockquotes → .insight callout
    if (line.startsWith("> ")) {
      if (!inBlockquote) {
        closeOpenBlocks();
        html.push('<div class="insight">');
        inBlockquote = true;
      }
      html.push(`<p>${inlineMarkdown(line.slice(2))}</p>`);
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      if (inList !== "ul") {
        closeOpenBlocks();
        html.push("<ul>");
        inList = "ul";
      }
      html.push(`<li>${inlineMarkdown(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      if (inList !== "ol") {
        closeOpenBlocks();
        html.push("<ol>");
        inList = "ol";
      }
      html.push(`<li>${inlineMarkdown(line.replace(/^\s*\d+\.\s+/, ""))}</li>`);
      continue;
    }

    // Paragraph
    closeOpenBlocks();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  closeOpenBlocks();
  if (inCodeBlock) html.push("</div>");

  return html.join("\n");

  function closeOpenBlocks(): void {
    if (inList) { html.push(inList === "ul" ? "</ul>" : "</ol>"); inList = null; }
    if (inBlockquote) { html.push("</div>"); inBlockquote = false; }
    if (inTable) { html.push("</table>"); inTable = false; tableHeaderDone = false; }
  }
}

/** Escape HTML entities. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert inline markdown (bold, italic, code, links) to HTML. */
function inlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

// ─── Script: Wiki Nav scroll spy + progress ───────────────────────────────────

const WIKI_NAV_SCRIPT = `
<script>
(function() {
  var nav = document.getElementById('wikiNav');
  var toggle = document.getElementById('navToggle');
  var overlay = document.getElementById('navOverlay');
  var backToTop = document.getElementById('backToTop');
  var progressFill = document.getElementById('navProgress');
  var progressText = document.getElementById('navProgressText');
  var navItems = document.querySelectorAll('.wiki-nav-item');
  var sections = document.querySelectorAll('section[id]');

  if (toggle) toggle.addEventListener('click', function() {
    nav.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  if (overlay) overlay.addEventListener('click', function() {
    nav.classList.remove('open');
    overlay.classList.remove('open');
  });

  if (nav) nav.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', function() {
      if (window.innerWidth <= 1200) {
        nav.classList.remove('open');
        overlay.classList.remove('open');
      }
    });
  });

  var ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(function() {
        var scrollTop = window.scrollY;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var progress = docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 0;
        if (progressFill) progressFill.style.width = progress + '%';
        if (progressText) progressText.textContent = progress + '% read';
        if (backToTop) backToTop.classList.toggle('visible', scrollTop > 400);

        var current = '';
        for (var i = 0; i < sections.length; i++) {
          if (sections[i].getBoundingClientRect().top <= 120) current = sections[i].id;
        }
        navItems.forEach(function(item) {
          var link = item.querySelector('a');
          item.classList.toggle('active', link && link.getAttribute('href') === '#' + current);
        });
        ticking = false;
      });
      ticking = true;
    }
  });

  if (backToTop) backToTop.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
</script>`;

// ─── Page Shell ───────────────────────────────────────────────────────────────

function pageShell(opts: {
  title: string;
  sidebar?: string;
  body: string;
  hasSidebar?: boolean;
}): string {
  const sidebarClass = opts.hasSidebar ? ' class="has-sidebar"' : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(opts.title)}</title>
  <style>${getCSS()}</style>
</head>
<body${sidebarClass}>
${opts.sidebar ?? ""}
${opts.body}
${opts.hasSidebar ? WIKI_NAV_SCRIPT : ""}
</body>
</html>`;
}

// ─── Sidebar Builder ──────────────────────────────────────────────────────────

function buildSidebar(title: string, subtitle: string, sections: { id: string; label: string }[]): string {
  const items = sections
    .map((s, i) => {
      const num = String(i + 1).padStart(2, "0");
      return `    <li class="wiki-nav-item"><a href="#${s.id}"><span class="nav-num">${num}</span> ${escapeHtml(s.label)}</a></li>`;
    })
    .join("\n");

  return `
<nav class="wiki-nav" id="wikiNav">
  <div class="wiki-nav-header">
    <h4>${escapeHtml(title)}</h4>
    <p>${escapeHtml(subtitle)}</p>
  </div>
  <ul class="wiki-nav-list">
${items}
  </ul>
  <div class="wiki-nav-progress">
    <div class="wiki-nav-progress-bar">
      <div class="wiki-nav-progress-fill" id="navProgress"></div>
    </div>
    <div class="wiki-nav-progress-text" id="navProgressText">0% read</div>
  </div>
</nav>
<div class="wiki-nav-overlay" id="navOverlay"></div>
<button class="wiki-nav-toggle" id="navToggle" aria-label="Toggle navigation">&#9776;</button>
<button class="back-to-top" id="backToTop" aria-label="Back to top">&#8593;</button>`;
}

// ─── Hero Builder ─────────────────────────────────────────────────────────────

function buildHero(badge: string, title: string, subtitle: string, meta: string[]): string {
  const metaItems = meta.map((m) => `      <span>${escapeHtml(m)}</span>`).join("\n");
  return `
<div class="hero">
  <div class="hero-orb orb-1"></div>
  <div class="hero-orb orb-2"></div>
  <div class="container">
    <div class="hero-badge"><span class="dot"></span> ${escapeHtml(badge)}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(subtitle)}</p>
    <div class="hero-meta">
${metaItems}
    </div>
  </div>
</div>`;
}

// ─── Page Templates ───────────────────────────────────────────────────────────

/** Render a single hook documentation page. */
export function renderHookPage(hook: HookMeta, markdownContent: string, groupName: string): string {
  const color = eventColor(hook.event);
  const contentHtml = markdownToHtml(markdownContent);

  // Extract h2 headings from markdown for sidebar nav
  const headings = [...markdownContent.matchAll(/^## (.+)$/gm)].map((m) => ({
    id: m[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    label: m[1],
  }));

  const sidebar = headings.length > 2
    ? buildSidebar(hook.name, `${groupName} / ${hook.event}`, headings)
    : "";

  const hero = buildHero(
    "Hook Documentation",
    hook.name,
    hook.description || `${hook.event} hook in the ${groupName} group.`,
    [groupName, hook.event, "pai-hooks"],
  );

  const body = `
${hero}

<div class="container">
  <div class="tags">
    <span class="tag ${color}">${escapeHtml(hook.event)}</span>
    <span class="tag green">${escapeHtml(groupName)}</span>
  </div>

  ${contentHtml}

  <footer>
    <p>Generated from <code>${escapeHtml(hook.name)}/doc.md</code> &mdash; pai-hooks documentation</p>
  </footer>
</div>`;

  return pageShell({
    title: `${hook.name} — Hook Documentation`,
    sidebar,
    body,
    hasSidebar: headings.length > 2,
  });
}

/** Render a group index page listing all hooks in the group. */
export function renderGroupPage(group: GroupMeta): string {
  const cards = group.hooks
    .map((h) => {
      const color = eventColor(h.event);
      return `
      <div class="card ${color}" style="cursor:pointer;" onclick="location.href='${escapeHtml(h.name)}.html'">
        <div class="card-header">
          <div class="card-icon">&#x1F517;</div>
          <h3>${escapeHtml(h.name)}</h3>
          <span class="card-badge" style="background:var(--${color}-dim);color:var(--${color});">${escapeHtml(h.event)}</span>
        </div>
        <p>${escapeHtml(h.description || "No description")}</p>
      </div>`;
    })
    .join("\n");

  const hero = buildHero(
    "Hook Group",
    group.name,
    group.description || `${group.hooks.length} hooks in this group.`,
    [`${group.hooks.length} hooks`, "pai-hooks"],
  );

  const summaryGrid = `
  <div class="summary-grid">
    ${[...new Set(group.hooks.map((h) => h.event))].map((event, i) => {
      const count = group.hooks.filter((h) => h.event === event).length;
      return `<div class="summary-item"><div class="num">${count}</div><div class="label">${escapeHtml(event)}</div></div>`;
    }).join("\n    ")}
  </div>`;

  const body = `
${hero}

<div class="container">
  ${summaryGrid}

  <div class="section-label">Hooks</div>
  <h2>All Hooks in ${escapeHtml(group.name)}</h2>

  ${cards}

  <footer>
    <p>pai-hooks documentation</p>
  </footer>
</div>`;

  return pageShell({ title: `${group.name} — Hook Group`, body });
}

/** Render the top-level index page listing all groups. */
export function renderIndexPage(groups: GroupMeta[]): string {
  const totalHooks = groups.reduce((n, g) => n + g.hooks.length, 0);
  const totalGroups = groups.length;

  const groupCards = groups
    .map((g) => {
      return `
      <div class="card accent" style="cursor:pointer;" onclick="location.href='groups/${escapeHtml(g.name)}/index.html'">
        <div class="card-header">
          <div class="card-icon">&#x1F4C1;</div>
          <h3>${escapeHtml(g.name)}</h3>
          <span class="card-badge" style="background:var(--accent-glow);color:var(--accent-bright);">${g.hooks.length} hooks</span>
        </div>
        <p>${escapeHtml(g.description || `${g.hooks.length} hooks`)}</p>
      </div>`;
    })
    .join("\n");

  const hero = buildHero(
    "Documentation",
    "pai-hooks",
    `${totalHooks} hooks across ${totalGroups} groups.`,
    ["March 2026", `v1.0`, `${totalHooks} hooks`, `${totalGroups} groups`],
  );

  const body = `
${hero}

<div class="container">
  <div class="summary-grid">
    <div class="summary-item"><div class="num">${totalGroups}</div><div class="label">Groups</div></div>
    <div class="summary-item"><div class="num">${totalHooks}</div><div class="label">Hooks</div></div>
  </div>

  <div class="section-label">Groups</div>
  <h2>All Hook Groups</h2>

  ${groupCards}

  <footer>
    <p>pai-hooks documentation</p>
    <div class="collab">
      <span>pai-hooks</span>
    </div>
  </footer>
</div>`;

  return pageShell({ title: "pai-hooks — Documentation", body });
}
