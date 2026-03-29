import { describe, expect, test } from "bun:test";
import {
  bodySimilarity,
  buildNodeTypeVector,
  cosineSimilarity,
} from "@tools/pattern-detector/similarity";
import type { ParsedFunction } from "@tools/pattern-detector/types";

function makeFunction(overrides: Partial<ParsedFunction> = {}): ParsedFunction {
  return {
    name: "testFn",
    file: "/src/a.ts",
    line: 1,
    params: [],
    returnType: null,
    imports: [],
    bodyNodeTypes: [],
    bodyHash: "abc123",
    ...overrides,
  };
}

describe("buildNodeTypeVector", () => {
  test("returns empty map for empty bodyNodeTypes", () => {
    const fn = makeFunction({ bodyNodeTypes: [] });
    const vec = buildNodeTypeVector(fn);
    expect(vec.size).toBe(0);
  });

  test("counts single node type correctly", () => {
    const fn = makeFunction({ bodyNodeTypes: ["IfStatement"] });
    const vec = buildNodeTypeVector(fn);
    expect(vec.get("IfStatement")).toBe(1);
  });

  test("counts repeated node types correctly", () => {
    const fn = makeFunction({
      bodyNodeTypes: [
        "IfStatement",
        "CallExpression",
        "IfStatement",
        "CallExpression",
        "CallExpression",
      ],
    });
    const vec = buildNodeTypeVector(fn);
    expect(vec.get("IfStatement")).toBe(2);
    expect(vec.get("CallExpression")).toBe(3);
  });

  test("counts multiple distinct node types", () => {
    const fn = makeFunction({
      bodyNodeTypes: ["ReturnStatement", "BinaryExpression", "MemberExpression"],
    });
    const vec = buildNodeTypeVector(fn);
    expect(vec.get("ReturnStatement")).toBe(1);
    expect(vec.get("BinaryExpression")).toBe(1);
    expect(vec.get("MemberExpression")).toBe(1);
    expect(vec.size).toBe(3);
  });

  test("absent node types return undefined (not 0)", () => {
    const fn = makeFunction({ bodyNodeTypes: ["ReturnStatement"] });
    const vec = buildNodeTypeVector(fn);
    expect(vec.get("IfStatement")).toBeUndefined();
  });
});

describe("cosineSimilarity", () => {
  test("returns 1.0 for identical non-empty vectors", () => {
    const v = new Map([
      ["IfStatement", 2],
      ["CallExpression", 3],
    ]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 10);
  });

  test("returns 1.0 for identical copied vectors", () => {
    const a = new Map([
      ["A", 1],
      ["B", 2],
    ]);
    const b = new Map([
      ["A", 1],
      ["B", 2],
    ]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 10);
  });

  test("returns 0 for orthogonal vectors (no shared keys)", () => {
    const a = new Map([["IfStatement", 1]]);
    const b = new Map([["CallExpression", 1]]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  test("returns 0 when first vector is empty (zero magnitude)", () => {
    const a = new Map<string, number>();
    const b = new Map([["IfStatement", 1]]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  test("returns 0 when second vector is empty (zero magnitude)", () => {
    const a = new Map([["IfStatement", 1]]);
    const b = new Map<string, number>();
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  test("returns 0 for both empty vectors", () => {
    const a = new Map<string, number>();
    const b = new Map<string, number>();
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  test("returns value in [0, 1] for partially overlapping vectors", () => {
    const a = new Map([
      ["A", 3],
      ["B", 4],
    ]);
    const b = new Map([
      ["A", 1],
      ["C", 2],
    ]);
    const result = cosineSimilarity(a, b);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
    expect(result).toBeGreaterThan(0);
  });

  test("is symmetric", () => {
    const a = new Map([
      ["X", 2],
      ["Y", 1],
    ]);
    const b = new Map([
      ["X", 1],
      ["Z", 3],
    ]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
  });

  test("proportional vectors yield similarity 1.0", () => {
    const a = new Map([
      ["A", 1],
      ["B", 2],
    ]);
    const b = new Map([
      ["A", 3],
      ["B", 6],
    ]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 10);
  });
});

describe("bodySimilarity", () => {
  test("returns 1.0 for identical functions (same node types, same depth)", () => {
    const nodes = ["IfStatement", "CallExpression", "ReturnStatement"];
    const a = makeFunction({ bodyNodeTypes: nodes });
    const b = makeFunction({ bodyNodeTypes: nodes });
    const score = bodySimilarity(a, b);
    expect(score).toBeCloseTo(1.0, 5);
  });

  test("returns high score for very similar functions", () => {
    const a = makeFunction({
      bodyNodeTypes: ["IfStatement", "CallExpression", "CallExpression", "ReturnStatement"],
    });
    const b = makeFunction({
      bodyNodeTypes: ["IfStatement", "CallExpression", "CallExpression", "ReturnStatement"],
    });
    expect(bodySimilarity(a, b)).toBeGreaterThan(0.9);
  });

  test("returns low score for completely different functions", () => {
    const a = makeFunction({
      bodyNodeTypes: ["IfStatement", "ForStatement", "WhileStatement"],
    });
    const b = makeFunction({
      bodyNodeTypes: ["CallExpression", "MemberExpression", "AssignmentExpression"],
    });
    const score = bodySimilarity(a, b);
    expect(score).toBeLessThan(0.5);
  });

  test("returns score in [0, 1]", () => {
    const a = makeFunction({ bodyNodeTypes: ["A", "B"] });
    const b = makeFunction({ bodyNodeTypes: ["C", "D"] });
    const score = bodySimilarity(a, b);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  test("is symmetric", () => {
    const a = makeFunction({
      bodyNodeTypes: ["IfStatement", "CallExpression"],
    });
    const b = makeFunction({
      bodyNodeTypes: ["ForStatement", "ReturnStatement"],
    });
    expect(bodySimilarity(a, b)).toBeCloseTo(bodySimilarity(b, a), 10);
  });

  test("empty body functions yield non-zero score (depth and call parts score 1.0)", () => {
    const a = makeFunction({ bodyNodeTypes: [] });
    const b = makeFunction({ bodyNodeTypes: [] });
    // cosine: 0 (zero magnitude), depthPart: 1.0, callOverlapPart: 1.0
    // score = 0.6*0 + 0.2*1 + 0.2*1 = 0.4
    const score = bodySimilarity(a, b);
    expect(score).toBeCloseTo(0.4, 5);
  });

  test("call expression count affects score", () => {
    const manyCallsA = makeFunction({
      bodyNodeTypes: ["CallExpression", "CallExpression", "CallExpression"],
    });
    const noCallsB = makeFunction({ bodyNodeTypes: ["IfStatement", "IfStatement"] });
    const score = bodySimilarity(manyCallsA, noCallsB);
    // Different node types and different call counts -> lower score
    expect(score).toBeLessThan(0.6);
  });
});
