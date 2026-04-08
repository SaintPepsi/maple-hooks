import { describe, expect, it } from "bun:test";
import { matchesKeywords, parseFrontmatter } from "./SteeringRuleInjector.contract";

describe("parseFrontmatter", () => {
  it("parses valid frontmatter with all fields", () => {
    const content = `---
name: test-rule
events: [SessionStart, UserPromptSubmit]
keywords: [push, remote]
---

Rule content here.`;
    const result = parseFrontmatter(content);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("test-rule");
    expect(result!.events).toEqual(["SessionStart", "UserPromptSubmit"]);
    expect(result!.keywords).toEqual(["push", "remote"]);
    expect(result!.body).toBe("Rule content here.");
  });

  it("parses frontmatter with empty keywords", () => {
    const content = `---
name: always-rule
events: [SessionStart]
keywords: []
---

Always injected.`;
    const result = parseFrontmatter(content);
    expect(result!.keywords).toEqual([]);
  });

  it("returns null for missing frontmatter", () => {
    expect(parseFrontmatter("Just plain markdown.")).toBeNull();
  });

  it("returns null for missing name", () => {
    const content = `---
events: [SessionStart]
keywords: []
---
No name.`;
    expect(parseFrontmatter(content)).toBeNull();
  });

  it("returns null for missing events", () => {
    const content = `---
name: no-events
keywords: []
---
No events.`;
    expect(parseFrontmatter(content)).toBeNull();
  });

  it("trims body content", () => {
    const content = `---
name: trim-test
events: [SessionStart]
keywords: []
---

  Content with spaces.
`;
    expect(parseFrontmatter(content)!.body).toBe("Content with spaces.");
  });
});

describe("matchesKeywords", () => {
  it("returns true when keyword in prompt", () => {
    expect(matchesKeywords("let's push to remote", ["push", "remote"])).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(matchesKeywords("Minimize Output TOKENS", ["tokens"])).toBe(true);
  });

  it("returns false when no match", () => {
    expect(matchesKeywords("refactor the parser", ["push", "deploy"])).toBe(false);
  });

  it("returns false for empty keywords", () => {
    expect(matchesKeywords("anything here", [])).toBe(false);
  });
});
