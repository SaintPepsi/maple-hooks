import { describe, test, expect } from "bun:test";
import { detectImportFingerprint } from "@tools/pattern-detector/detectors/import-fingerprint";
import type { ParsedFile, ParsedFunction } from "@tools/pattern-detector/types";

function makeFunction(overrides: Partial<ParsedFunction> = {}): ParsedFunction {
  return {
    name: "fn",
    file: "/src/a.ts",
    line: 1,
    params: [],
    returnType: null,
    imports: [],
    bodyNodeTypes: [],
    bodyHash: "hash-default",
    ...overrides,
  };
}

function makeFile(path: string, functions: ParsedFunction[]): ParsedFile {
  return { path, functions, imports: [] };
}

describe("detectImportFingerprint", () => {
  test("returns empty array for no files", () => {
    expect(detectImportFingerprint([])).toEqual([]);
  });

  test("returns empty array when all functions have unique import sets", () => {
    const files = [
      makeFile("/a.ts", [
        makeFunction({ name: "fn1", imports: ["react"] }),
      ]),
      makeFile("/b.ts", [
        makeFunction({ name: "fn2", imports: ["lodash"] }),
      ]),
    ];
    expect(detectImportFingerprint(files)).toEqual([]);
  });

  test("discards single-member groups", () => {
    const files = [
      makeFile("/a.ts", [
        makeFunction({ name: "loner", imports: ["unique-lib"] }),
        makeFunction({ name: "shared1", imports: ["react", "fs"] }),
      ]),
      makeFile("/b.ts", [
        makeFunction({ name: "shared2", imports: ["react", "fs"] }),
      ]),
    ];
    const clusters = detectImportFingerprint(files);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].members.map((m) => m.functionName)).not.toContain("loner");
  });

  test("groups functions with identical import sets", () => {
    const files = [
      makeFile("/a.ts", [
        makeFunction({ name: "fn1", imports: ["react", "lodash"] }),
      ]),
      makeFile("/b.ts", [
        makeFunction({ name: "fn2", imports: ["react", "lodash"] }),
      ]),
    ];
    const clusters = detectImportFingerprint(files);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].members).toHaveLength(2);
  });

  test("groups by sorted import fingerprint (order-independent)", () => {
    const files = [
      makeFile("/a.ts", [
        makeFunction({ name: "fn1", imports: ["lodash", "react"] }),
      ]),
      makeFile("/b.ts", [
        makeFunction({ name: "fn2", imports: ["react", "lodash"] }),
      ]),
    ];
    const clusters = detectImportFingerprint(files);
    // Same imports in different order -> same fingerprint -> one cluster
    expect(clusters).toHaveLength(1);
    expect(clusters[0].members).toHaveLength(2);
  });

  test("does not group functions with different import sets", () => {
    const files = [
      makeFile("/a.ts", [
        makeFunction({ name: "fn1", imports: ["react"] }),
        makeFunction({ name: "fn2", imports: ["react"] }),
      ]),
      makeFile("/b.ts", [
        makeFunction({ name: "fn3", imports: ["lodash"] }),
        makeFunction({ name: "fn4", imports: ["lodash"] }),
      ]),
    ];
    const clusters = detectImportFingerprint(files);
    expect(clusters).toHaveLength(2);
  });

  test("groups functions with no imports together", () => {
    const files = [
      makeFile("/a.ts", [makeFunction({ name: "fn1", imports: [] })]),
      makeFile("/b.ts", [makeFunction({ name: "fn2", imports: [] })]),
    ];
    const clusters = detectImportFingerprint(files);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].members).toHaveLength(2);
  });

  test("detector field is 'import'", () => {
    const files = [
      makeFile("/a.ts", [makeFunction({ name: "fn1", imports: ["x"] })]),
      makeFile("/b.ts", [makeFunction({ name: "fn2", imports: ["x"] })]),
    ];
    const [cluster] = detectImportFingerprint(files);
    expect(cluster.detector).toBe("import");
  });

  test("confidence is in [0, 1] range", () => {
    const files = [
      makeFile("/a.ts", [
        makeFunction({ name: "fn1", imports: ["react", "lodash"] }),
      ]),
      makeFile("/b.ts", [
        makeFunction({ name: "fn2", imports: ["react", "lodash"] }),
      ]),
    ];
    const [cluster] = detectImportFingerprint(files);
    expect(cluster.confidence).toBeGreaterThanOrEqual(0);
    expect(cluster.confidence).toBeLessThanOrEqual(1);
  });

  test("identical params boost confidence vs mismatched params", () => {
    const matchingFiles = [
      makeFile("/a.ts", [
        makeFunction({
          name: "fn1",
          imports: ["react"],
          params: [{ index: 0, typeAnnotation: "string" }],
        }),
      ]),
      makeFile("/b.ts", [
        makeFunction({
          name: "fn2",
          imports: ["react"],
          params: [{ index: 0, typeAnnotation: "string" }],
        }),
      ]),
    ];
    const mismatchedFiles = [
      makeFile("/a.ts", [
        makeFunction({
          name: "fn1",
          imports: ["react"],
          params: [{ index: 0, typeAnnotation: "string" }],
        }),
      ]),
      makeFile("/b.ts", [
        makeFunction({
          name: "fn2",
          imports: ["react"],
          params: [{ index: 0, typeAnnotation: "number" }],
        }),
      ]),
    ];
    const [matchCluster] = detectImportFingerprint(matchingFiles);
    const [mismatchCluster] = detectImportFingerprint(mismatchedFiles);
    expect(matchCluster.confidence).toBeGreaterThan(mismatchCluster.confidence);
  });

  test("no-params functions have confidence equal to import score (param similarity = 1)", () => {
    const files = [
      makeFile("/a.ts", [
        makeFunction({ name: "fn1", imports: ["react"], params: [] }),
      ]),
      makeFile("/b.ts", [
        makeFunction({ name: "fn2", imports: ["react"], params: [] }),
      ]),
    ];
    const [cluster] = detectImportFingerprint(files);
    // sharedImports=["react"], union=["react"] -> importScore=1.0, paramSim=1.0 -> confidence=1.0
    expect(cluster.confidence).toBeCloseTo(1.0, 5);
  });

  test("cluster id starts with 'import:'", () => {
    const files = [
      makeFile("/a.ts", [makeFunction({ name: "fn1", imports: ["x"] })]),
      makeFile("/b.ts", [makeFunction({ name: "fn2", imports: ["x"] })]),
    ];
    const [cluster] = detectImportFingerprint(files);
    expect(cluster.id.startsWith("import:")).toBe(true);
  });

  test("clusters are sorted descending by confidence", () => {
    // Group 1: same imports, same param types (high confidence)
    // Group 2: same imports, different param types (lower confidence)
    const files = [
      makeFile("/a.ts", [
        makeFunction({
          name: "high1",
          imports: ["react"],
          params: [{ index: 0, typeAnnotation: "string" }],
        }),
        makeFunction({
          name: "low1",
          imports: ["lodash"],
          params: [{ index: 0, typeAnnotation: "string" }],
        }),
      ]),
      makeFile("/b.ts", [
        makeFunction({
          name: "high2",
          imports: ["react"],
          params: [{ index: 0, typeAnnotation: "string" }],
        }),
        makeFunction({
          name: "low2",
          imports: ["lodash"],
          params: [{ index: 0, typeAnnotation: "number" }],
        }),
      ]),
    ];
    const clusters = detectImportFingerprint(files);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].confidence).toBeGreaterThanOrEqual(clusters[1].confidence);
  });

  test("cluster members include evidence listing shared imports", () => {
    const files = [
      makeFile("/a.ts", [makeFunction({ name: "fn1", imports: ["react"] })]),
      makeFile("/b.ts", [makeFunction({ name: "fn2", imports: ["react"] })]),
    ];
    const [cluster] = detectImportFingerprint(files);
    for (const member of cluster.members) {
      expect(Array.isArray(member.evidence)).toBe(true);
    }
  });

  test("label is 'no-imports' when functions share an empty import set", () => {
    const files = [
      makeFile("/a.ts", [makeFunction({ name: "fn1", imports: [] })]),
      makeFile("/b.ts", [makeFunction({ name: "fn2", imports: [] })]),
    ];
    const [cluster] = detectImportFingerprint(files);
    expect(cluster.label).toBe("no-imports");
  });

  test("label includes module base-names from shared imports", () => {
    const files = [
      makeFile("/a.ts", [makeFunction({ name: "fn1", imports: ["react"] })]),
      makeFile("/b.ts", [makeFunction({ name: "fn2", imports: ["react"] })]),
    ];
    const [cluster] = detectImportFingerprint(files);
    expect(cluster.label).toContain("react");
  });
});
