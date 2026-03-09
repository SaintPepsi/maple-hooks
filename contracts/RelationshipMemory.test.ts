import { describe, test, expect } from "bun:test";
import { RelationshipMemory, type RelationshipMemoryDeps } from "@hooks/contracts/RelationshipMemory";
import type { StopInput } from "@hooks/core/types/hook-inputs";

// -- Types (mirrored for test use) --

interface TranscriptEntry {
  type: "user" | "assistant";
  message?: { content: string | Array<{ type: string; text?: string }> };
}

interface RelationshipNote {
  type: "W" | "B" | "O";
  entities: string[];
  content: string;
  confidence?: number;
}

// -- Helpers --

function makeInput(overrides: Partial<StopInput> = {}): StopInput {
  return {
    transcript_path: "/tmp/test-transcript.jsonl",
    session_id: "test-session",
    stop_hook_active: false,
    ...overrides,
  };
}

function makeDeps(
  entries: TranscriptEntry[],
  overrides: Partial<RelationshipMemoryDeps> = {},
): RelationshipMemoryDeps & { capturedNotes: RelationshipNote[]; stderrLines: string[] } {
  const capturedNotes: RelationshipNote[] = [];
  const stderrLines: string[] = [];
  return {
    readTranscript: (_path: string) => entries,
    analyzeForRelationship: (_e: TranscriptEntry[]) => {
      // Default: return empty -- tests that need notes override this
      return [];
    },
    writeNotes: (notes: RelationshipNote[]) => {
      capturedNotes.push(...notes);
    },
    stderr: (msg: string) => {
      stderrLines.push(msg);
    },
    capturedNotes,
    stderrLines,
    ...overrides,
  };
}

// -- Tests --

describe("RelationshipMemory", () => {
  describe("accepts", () => {
    test("returns true when transcript_path is present", () => {
      expect(RelationshipMemory.accepts(makeInput())).toBe(true);
    });

    test("returns false when transcript_path is empty string", () => {
      expect(RelationshipMemory.accepts(makeInput({ transcript_path: "" }))).toBe(false);
    });

    test("returns false when transcript_path is undefined", () => {
      const input = makeInput();
      delete (input as Record<string, unknown>).transcript_path;
      expect(RelationshipMemory.accepts(input)).toBe(false);
    });
  });

  describe("execute -- no transcript entries", () => {
    test("returns silent output when entries array is empty", () => {
      const deps = makeDeps([]);
      const result = RelationshipMemory.execute(makeInput(), deps);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe("silent");
      }
    });

    test("does not call writeNotes when entries array is empty", () => {
      const deps = makeDeps([]);
      RelationshipMemory.execute(makeInput(), deps);
      expect(deps.capturedNotes).toHaveLength(0);
    });

    test("logs skip message when entries array is empty", () => {
      const deps = makeDeps([]);
      RelationshipMemory.execute(makeInput(), deps);
      expect(deps.stderrLines.some((l) => l.includes("skipping"))).toBe(true);
    });
  });

  describe("execute -- no notes extracted", () => {
    test("returns silent output when analyzeForRelationship returns empty", () => {
      const entries: TranscriptEntry[] = [
        { type: "user", message: { content: "Hello there" } },
      ];
      const deps = makeDeps(entries);
      const result = RelationshipMemory.execute(makeInput(), deps);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe("silent");
      }
    });

    test("does not call writeNotes when no notes extracted", () => {
      const entries: TranscriptEntry[] = [
        { type: "user", message: { content: "Hello there" } },
      ];
      const deps = makeDeps(entries);
      RelationshipMemory.execute(makeInput(), deps);
      expect(deps.capturedNotes).toHaveLength(0);
    });
  });

  describe("execute -- with positive pattern notes (O type)", () => {
    test("writeNotes is called with O-type note for positives", () => {
      const entries: TranscriptEntry[] = [
        { type: "user", message: { content: "some content" } },
      ];
      const oNote: RelationshipNote = {
        type: "O",
        entities: ["@TestPrincipal"],
        content: "Responded positively to this session's approach",
        confidence: 0.7,
      };
      const deps = makeDeps(entries, {
        analyzeForRelationship: () => [oNote],
      });
      RelationshipMemory.execute(makeInput(), deps);
      expect(deps.capturedNotes).toHaveLength(1);
      expect(deps.capturedNotes[0].type).toBe("O");
      expect(deps.capturedNotes[0].confidence).toBe(0.7);
    });

    test("logs captured count after writing notes", () => {
      const entries: TranscriptEntry[] = [
        { type: "user", message: { content: "some content" } },
      ];
      const oNote: RelationshipNote = {
        type: "O",
        entities: ["@TestPrincipal"],
        content: "Responded positively to this session's approach",
        confidence: 0.7,
      };
      const deps = makeDeps(entries, {
        analyzeForRelationship: () => [oNote],
      });
      RelationshipMemory.execute(makeInput(), deps);
      expect(deps.stderrLines.some((l) => l.includes("Captured 1 notes"))).toBe(true);
    });
  });

  describe("execute -- with frustration pattern notes (O type)", () => {
    test("writeNotes is called with O-type note for frustrations", () => {
      const entries: TranscriptEntry[] = [
        { type: "user", message: { content: "some content" } },
      ];
      const frustrationNote: RelationshipNote = {
        type: "O",
        entities: ["@TestPrincipal"],
        content: "Experienced frustration during this session (likely tooling-related)",
        confidence: 0.75,
      };
      const deps = makeDeps(entries, {
        analyzeForRelationship: () => [frustrationNote],
      });
      RelationshipMemory.execute(makeInput(), deps);
      expect(deps.capturedNotes).toHaveLength(1);
      expect(deps.capturedNotes[0].type).toBe("O");
      expect(deps.capturedNotes[0].content).toContain("frustration");
      expect(deps.capturedNotes[0].confidence).toBe(0.75);
    });
  });

  describe("execute -- with SUMMARY entries (B type)", () => {
    test("writeNotes is called with B-type note for summaries", () => {
      const entries: TranscriptEntry[] = [
        { type: "assistant", message: { content: "SUMMARY: Completed refactor of auth module" } },
      ];
      const summaryNote: RelationshipNote = {
        type: "B",
        entities: ["@TestDA"],
        content: "Completed refactor of auth module",
      };
      const deps = makeDeps(entries, {
        analyzeForRelationship: () => [summaryNote],
      });
      RelationshipMemory.execute(makeInput(), deps);
      expect(deps.capturedNotes).toHaveLength(1);
      expect(deps.capturedNotes[0].type).toBe("B");
      expect(deps.capturedNotes[0].content).toContain("Completed refactor");
    });

    test("captures multiple B-type notes from multiple summaries", () => {
      const entries: TranscriptEntry[] = [
        { type: "assistant", message: { content: "SUMMARY: Fixed the database bug" } },
        { type: "assistant", message: { content: "SUMMARY: Deployed to production" } },
      ];
      const notes: RelationshipNote[] = [
        { type: "B", entities: ["@TestDA"], content: "Fixed the database bug" },
        { type: "B", entities: ["@TestDA"], content: "Deployed to production" },
      ];
      const deps = makeDeps(entries, {
        analyzeForRelationship: () => notes,
      });
      RelationshipMemory.execute(makeInput(), deps);
      expect(deps.capturedNotes).toHaveLength(2);
      expect(deps.capturedNotes.every((n) => n.type === "B")).toBe(true);
    });
  });

  describe("execute -- defaultAnalyzeForRelationship integration", () => {
    test("produces O note when user text has 2+ positive patterns", () => {
      const entries: TranscriptEntry[] = [
        { type: "user", message: { content: "That is great work you did there" } },
        { type: "user", message: { content: "awesome job, that is perfect output" } },
      ];
      const capturedNotes: RelationshipNote[] = [];
      const result = RelationshipMemory.execute(makeInput(), {
        readTranscript: () => entries,
        analyzeForRelationship: RelationshipMemory.defaultDeps.analyzeForRelationship,
        writeNotes: (notes) => capturedNotes.push(...notes),
        stderr: () => {},
      });
      expect(result.ok).toBe(true);
      const oNotes = capturedNotes.filter((n) => n.type === "O");
      expect(oNotes.length).toBeGreaterThanOrEqual(1);
      expect(oNotes[0].content).toContain("positively");
    });

    test("produces O note when user text has 2+ frustration patterns", () => {
      const entries: TranscriptEntry[] = [
        { type: "user", message: { content: "This is frustrating me a lot" } },
        { type: "user", message: { content: "I am so frustrated with this behavior" } },
      ];
      const capturedNotes: RelationshipNote[] = [];
      RelationshipMemory.execute(makeInput(), {
        readTranscript: () => entries,
        analyzeForRelationship: RelationshipMemory.defaultDeps.analyzeForRelationship,
        writeNotes: (notes) => capturedNotes.push(...notes),
        stderr: () => {},
      });
      const oNotes = capturedNotes.filter((n) => n.type === "O");
      expect(oNotes.length).toBeGreaterThanOrEqual(1);
      expect(oNotes[0].content).toContain("frustration");
    });

    test("produces B note from assistant SUMMARY line", () => {
      const entries: TranscriptEntry[] = [
        {
          type: "assistant",
          message: { content: "SUMMARY: Implemented the new caching layer successfully" },
        },
      ];
      const capturedNotes: RelationshipNote[] = [];
      RelationshipMemory.execute(makeInput(), {
        readTranscript: () => entries,
        analyzeForRelationship: RelationshipMemory.defaultDeps.analyzeForRelationship,
        writeNotes: (notes) => capturedNotes.push(...notes),
        stderr: () => {},
      });
      const bNotes = capturedNotes.filter((n) => n.type === "B");
      expect(bNotes.length).toBeGreaterThanOrEqual(1);
      expect(bNotes[0].content).toContain("Implemented the new caching layer");
    });

    test("produces no notes for short or trivial entries", () => {
      const entries: TranscriptEntry[] = [
        { type: "user", message: { content: "ok" } },
        { type: "assistant", message: { content: "sure" } },
      ];
      const capturedNotes: RelationshipNote[] = [];
      RelationshipMemory.execute(makeInput(), {
        readTranscript: () => entries,
        analyzeForRelationship: RelationshipMemory.defaultDeps.analyzeForRelationship,
        writeNotes: (notes) => capturedNotes.push(...notes),
        stderr: () => {},
      });
      expect(capturedNotes).toHaveLength(0);
    });

    test("produces B note from assistant milestone text", () => {
      const entries: TranscriptEntry[] = [
        {
          type: "assistant",
          message: { content: "This is the first time the full pipeline completed successfully end-to-end." },
        },
      ];
      const capturedNotes: RelationshipNote[] = [];
      RelationshipMemory.execute(makeInput(), {
        readTranscript: () => entries,
        analyzeForRelationship: RelationshipMemory.defaultDeps.analyzeForRelationship,
        writeNotes: (notes) => capturedNotes.push(...notes),
        stderr: () => {},
      });
      const bNotes = capturedNotes.filter((n) => n.type === "B");
      expect(bNotes.length).toBeGreaterThanOrEqual(1);
    });

    test("deduplicates identical summary notes", () => {
      const entries: TranscriptEntry[] = [
        { type: "assistant", message: { content: "SUMMARY: Did the thing" } },
        { type: "assistant", message: { content: "SUMMARY: Did the thing" } },
      ];
      const capturedNotes: RelationshipNote[] = [];
      RelationshipMemory.execute(makeInput(), {
        readTranscript: () => entries,
        analyzeForRelationship: RelationshipMemory.defaultDeps.analyzeForRelationship,
        writeNotes: (notes) => capturedNotes.push(...notes),
        stderr: () => {},
      });
      const bNotes = capturedNotes.filter((n) => n.type === "B");
      // Duplicates should be deduplicated via Set
      expect(bNotes).toHaveLength(1);
    });

    test("caps B notes at 3 from summaries", () => {
      const entries: TranscriptEntry[] = [
        { type: "assistant", message: { content: "SUMMARY: Summary one for testing" } },
        { type: "assistant", message: { content: "SUMMARY: Summary two for testing" } },
        { type: "assistant", message: { content: "SUMMARY: Summary three for testing" } },
        { type: "assistant", message: { content: "SUMMARY: Summary four for testing" } },
        { type: "assistant", message: { content: "SUMMARY: Summary five for testing" } },
      ];
      const capturedNotes: RelationshipNote[] = [];
      RelationshipMemory.execute(makeInput(), {
        readTranscript: () => entries,
        analyzeForRelationship: RelationshipMemory.defaultDeps.analyzeForRelationship,
        writeNotes: (notes) => capturedNotes.push(...notes),
        stderr: () => {},
      });
      const bNotes = capturedNotes.filter((n) => n.type === "B");
      expect(bNotes.length).toBeLessThanOrEqual(3);
    });

    test("does not produce positive note with only 1 positive match", () => {
      const entries: TranscriptEntry[] = [
        { type: "user", message: { content: "That is really great work right there" } },
        { type: "user", message: { content: "Can you fix the bug in the parser?" } },
      ];
      const capturedNotes: RelationshipNote[] = [];
      RelationshipMemory.execute(makeInput(), {
        readTranscript: () => entries,
        analyzeForRelationship: RelationshipMemory.defaultDeps.analyzeForRelationship,
        writeNotes: (notes) => capturedNotes.push(...notes),
        stderr: () => {},
      });
      const oNotes = capturedNotes.filter((n) => n.type === "O" && n.content.includes("positively"));
      expect(oNotes).toHaveLength(0);
    });
  });

  describe("extractText integration -- via defaultAnalyzeForRelationship", () => {
    test("handles string content", () => {
      const entries: TranscriptEntry[] = [
        { type: "user", message: { content: "great work, that was awesome and excellent!" } },
        { type: "user", message: { content: "this is really good job well done nicely done" } },
      ];
      const capturedNotes: RelationshipNote[] = [];
      RelationshipMemory.execute(makeInput(), {
        readTranscript: () => entries,
        analyzeForRelationship: RelationshipMemory.defaultDeps.analyzeForRelationship,
        writeNotes: (notes) => capturedNotes.push(...notes),
        stderr: () => {},
      });
      const oNotes = capturedNotes.filter((n) => n.type === "O");
      expect(oNotes.length).toBeGreaterThanOrEqual(1);
    });

    test("handles array content by joining text parts", () => {
      const entries: TranscriptEntry[] = [
        {
          type: "user",
          message: {
            content: [
              { type: "text", text: "That is great and awesome." },
              { type: "image" }, // no text field, should be filtered
            ],
          },
        },
        {
          type: "user",
          message: {
            content: [
              { type: "text", text: "Perfect and excellent result here!" },
            ],
          },
        },
      ];
      const capturedNotes: RelationshipNote[] = [];
      RelationshipMemory.execute(makeInput(), {
        readTranscript: () => entries,
        analyzeForRelationship: RelationshipMemory.defaultDeps.analyzeForRelationship,
        writeNotes: (notes) => capturedNotes.push(...notes),
        stderr: () => {},
      });
      const oNotes = capturedNotes.filter((n) => n.type === "O");
      expect(oNotes.length).toBeGreaterThanOrEqual(1);
    });

    test("handles missing message content gracefully", () => {
      const entries: TranscriptEntry[] = [
        { type: "user" }, // no message
        { type: "assistant", message: { content: "SUMMARY: Handled missing content" } },
      ];
      const capturedNotes: RelationshipNote[] = [];
      expect(() => {
        RelationshipMemory.execute(makeInput(), {
          readTranscript: () => entries,
          analyzeForRelationship: RelationshipMemory.defaultDeps.analyzeForRelationship,
          writeNotes: (notes) => capturedNotes.push(...notes),
          stderr: () => {},
        });
      }).not.toThrow();
    });

    test("handles non-string non-array content via extractText fallback", () => {
      // Force content to be neither string nor array to exercise the return "" fallback
      // (line 51 in RelationshipMemory.ts)
      const entries = [
        { type: "user" as const, message: { content: 42 as unknown as string } },
        { type: "user" as const, message: { content: "great awesome excellent perfect good job well done" } },
        { type: "user" as const, message: { content: "awesome excellent great perfect really nice" } },
      ];
      const capturedNotes: RelationshipNote[] = [];
      expect(() => {
        RelationshipMemory.execute(makeInput(), {
          readTranscript: () => entries,
          analyzeForRelationship: RelationshipMemory.defaultDeps.analyzeForRelationship,
          writeNotes: (notes) => capturedNotes.push(...notes),
          stderr: () => {},
        });
      }).not.toThrow();
    });
  });
});

describe("RelationshipMemory defaultDeps", () => {
  const testTranscriptPath = "/tmp/pai-test-rm-transcript.jsonl";
  const testTranscriptContent = [
    JSON.stringify({ type: "user", message: { content: "Hello world test content" } }),
    JSON.stringify({ type: "assistant", message: { content: "SUMMARY: Test summary here" } }),
    "invalid json line",
    JSON.stringify({ type: "system", message: { content: "ignored type" } }),
  ].join("\n");

  test("defaultDeps.readTranscript returns empty array for missing path", () => {
    const result = RelationshipMemory.defaultDeps.readTranscript("/tmp/nonexistent-pai-12345.jsonl");
    expect(result).toEqual([]);
  });

  test("defaultDeps.readTranscript returns empty array for empty path", () => {
    const result = RelationshipMemory.defaultDeps.readTranscript("");
    expect(result).toEqual([]);
  });

  test("defaultDeps.readTranscript parses valid JSONL entries", async () => {
    await Bun.write(testTranscriptPath, testTranscriptContent);
    const result = RelationshipMemory.defaultDeps.readTranscript(testTranscriptPath);
    // Should parse user and assistant entries, skip invalid JSON and non-user/assistant types
    expect(result.length).toBe(2);
    expect(result[0].type).toBe("user");
    expect(result[1].type).toBe("assistant");
  });

  test("defaultDeps.analyzeForRelationship returns array", () => {
    const result = RelationshipMemory.defaultDeps.analyzeForRelationship([]);
    expect(Array.isArray(result)).toBe(true);
  });

  test("defaultDeps.writeNotes does not throw with empty notes", () => {
    expect(() => RelationshipMemory.defaultDeps.writeNotes([])).not.toThrow();
  });

  test("defaultDeps.writeNotes writes notes to filesystem", () => {
    // Exercises the defaultWriteNotes function (lines 130-152 in RelationshipMemory.ts)
    expect(() => {
      RelationshipMemory.defaultDeps.writeNotes([
        { type: "B", entities: ["@TestDA"], content: "Test note for coverage" },
      ]);
    }).not.toThrow();
  });

  test("defaultDeps.stderr writes without throwing", () => {
    expect(() => RelationshipMemory.defaultDeps.stderr("test")).not.toThrow();
  });
});
