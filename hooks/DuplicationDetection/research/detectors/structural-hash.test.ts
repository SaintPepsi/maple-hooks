import { describe, expect, test } from "bun:test";
import { detectStructuralHash } from "@tools/pattern-detector/detectors/structural-hash";
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

describe("detectStructuralHash", () => {
  test("returns empty array when no files provided", () => {
    expect(detectStructuralHash([])).toEqual([]);
  });

  test("returns empty array when all functions have unique bodyHash", () => {
    const files = [
      makeFile("/a.ts", [makeFunction({ name: "a", bodyHash: "hash-1" })]),
      makeFile("/b.ts", [makeFunction({ name: "b", bodyHash: "hash-2" })]),
    ];
    expect(detectStructuralHash(files)).toEqual([]);
  });

  test("returns empty array for a single function (no duplicate possible)", () => {
    const files = [makeFile("/a.ts", [makeFunction({ name: "lone", bodyHash: "unique" })])];
    expect(detectStructuralHash(files)).toEqual([]);
  });

  test("discards single-member groups", () => {
    const files = [
      makeFile("/a.ts", [
        makeFunction({ name: "onlyOne", bodyHash: "solo-hash" }),
        makeFunction({ name: "dup1", bodyHash: "shared-hash" }),
      ]),
      makeFile("/b.ts", [makeFunction({ name: "dup2", bodyHash: "shared-hash" })]),
    ];
    const clusters = detectStructuralHash(files);
    // Only the shared-hash group becomes a cluster
    expect(clusters).toHaveLength(1);
    expect(clusters[0].members.map((m) => m.functionName)).toContain("dup1");
    expect(clusters[0].members.map((m) => m.functionName)).toContain("dup2");
  });

  test("groups functions with the same bodyHash into one cluster", () => {
    const files = [
      makeFile("/a.ts", [makeFunction({ name: "fn1", bodyHash: "abc" })]),
      makeFile("/b.ts", [makeFunction({ name: "fn2", bodyHash: "abc" })]),
    ];
    const clusters = detectStructuralHash(files);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].members).toHaveLength(2);
  });

  test("sets confidence to 1.0 for structural matches", () => {
    const files = [
      makeFile("/a.ts", [makeFunction({ name: "fn1", bodyHash: "abc" })]),
      makeFile("/b.ts", [makeFunction({ name: "fn2", bodyHash: "abc" })]),
    ];
    const [cluster] = detectStructuralHash(files);
    expect(cluster.confidence).toBe(1.0);
  });

  test("sets detector field to 'structural'", () => {
    const files = [
      makeFile("/a.ts", [makeFunction({ name: "fn1", bodyHash: "abc" })]),
      makeFile("/b.ts", [makeFunction({ name: "fn2", bodyHash: "abc" })]),
    ];
    const [cluster] = detectStructuralHash(files);
    expect(cluster.detector).toBe("structural");
  });

  test("cluster id contains the bodyHash", () => {
    const files = [
      makeFile("/a.ts", [makeFunction({ name: "fn1", bodyHash: "deadbeef" })]),
      makeFile("/b.ts", [makeFunction({ name: "fn2", bodyHash: "deadbeef" })]),
    ];
    const [cluster] = detectStructuralHash(files);
    expect(cluster.id).toContain("deadbeef");
  });

  test("produces separate clusters for distinct bodyHashes", () => {
    const files = [
      makeFile("/a.ts", [
        makeFunction({ name: "fn1", bodyHash: "hash-x" }),
        makeFunction({ name: "fn2", bodyHash: "hash-y" }),
      ]),
      makeFile("/b.ts", [
        makeFunction({ name: "fn3", bodyHash: "hash-x" }),
        makeFunction({ name: "fn4", bodyHash: "hash-y" }),
      ]),
    ];
    const clusters = detectStructuralHash(files);
    expect(clusters).toHaveLength(2);
    const ids = clusters.map((c) => c.id);
    expect(ids.find((id) => id.includes("hash-x"))).toBeDefined();
    expect(ids.find((id) => id.includes("hash-y"))).toBeDefined();
  });

  test("cluster members include correct file and line info", () => {
    const files = [
      makeFile("/a.ts", [makeFunction({ name: "fn1", file: "/a.ts", line: 10, bodyHash: "abc" })]),
      makeFile("/b.ts", [makeFunction({ name: "fn2", file: "/b.ts", line: 42, bodyHash: "abc" })]),
    ];
    const [cluster] = detectStructuralHash(files);
    const memberFn1 = cluster.members.find((m) => m.functionName === "fn1");
    const memberFn2 = cluster.members.find((m) => m.functionName === "fn2");
    expect(memberFn1?.file).toBe("/a.ts");
    expect(memberFn1?.line).toBe(10);
    expect(memberFn2?.file).toBe("/b.ts");
    expect(memberFn2?.line).toBe(42);
  });

  test("cluster members each have evidence array", () => {
    const files = [
      makeFile("/a.ts", [makeFunction({ name: "fn1", bodyHash: "abc" })]),
      makeFile("/b.ts", [makeFunction({ name: "fn2", bodyHash: "abc" })]),
    ];
    const [cluster] = detectStructuralHash(files);
    for (const member of cluster.members) {
      expect(Array.isArray(member.evidence)).toBe(true);
      expect(member.evidence.length).toBeGreaterThan(0);
    }
  });

  test("handles three or more functions with the same bodyHash", () => {
    const files = [
      makeFile("/a.ts", [makeFunction({ name: "fn1", bodyHash: "triple" })]),
      makeFile("/b.ts", [makeFunction({ name: "fn2", bodyHash: "triple" })]),
      makeFile("/c.ts", [makeFunction({ name: "fn3", bodyHash: "triple" })]),
    ];
    const clusters = detectStructuralHash(files);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].members).toHaveLength(3);
  });

  test("functions from the same file can form a cluster", () => {
    const files = [
      makeFile("/a.ts", [
        makeFunction({ name: "fn1", file: "/a.ts", bodyHash: "same" }),
        makeFunction({ name: "fn2", file: "/a.ts", bodyHash: "same" }),
      ]),
    ];
    const clusters = detectStructuralHash(files);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].members).toHaveLength(2);
  });
});
