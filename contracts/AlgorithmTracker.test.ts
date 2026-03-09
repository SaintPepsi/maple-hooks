import { describe, test, expect } from "bun:test";
import {
  AlgorithmTracker,
  detectPhaseFromBash,
  parseCriterion,
  type AlgorithmTrackerDeps,
} from "@hooks/contracts/AlgorithmTracker";
import { ok, err } from "@hooks/core/result";
import { fileReadFailed } from "@hooks/core/error";
import type { ToolHookInput } from "@hooks/core/types/hook-inputs";
import type { AlgorithmState, AlgorithmCriterion } from "@hooks/lib/algorithm-state";

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<ToolHookInput> & { tool_result?: string } = {}): ToolHookInput & { tool_result?: string } {
  return {
    session_id: "test-sess",
    tool_name: "Bash",
    tool_input: {},
    ...overrides,
  };
}

function makeState(overrides: Partial<AlgorithmState> = {}): AlgorithmState {
  return {
    active: true,
    sessionId: "test-sess",
    taskDescription: "Test task",
    currentPhase: "OBSERVE",
    phaseStartedAt: Date.now(),
    algorithmStartedAt: Date.now(),
    sla: "Standard",
    criteria: [],
    agents: [],
    capabilities: ["Task Tool"],
    phaseHistory: [{ phase: "OBSERVE", startedAt: Date.now(), criteriaCount: 0, agentCount: 0 }],
    ...overrides,
  };
}

function makeDeps(overrides: Partial<AlgorithmTrackerDeps> = {}): AlgorithmTrackerDeps {
  return {
    readState: () => null,
    writeState: () => {},
    phaseTransition: () => {},
    criteriaAdd: () => {},
    criteriaUpdate: () => {},
    agentAdd: () => {},
    effortLevelUpdate: () => {},
    setPhaseTab: () => {},
    fileExists: () => false,
    readJson: () => err(fileReadFailed("test", new Error("not found"))),
    fetch: () => Promise.resolve(new Response()),
    baseDir: "/tmp/test-pai",
    stderr: () => {},
    ...overrides,
  };
}

// ─── Contract Metadata ───────────────────────────────────────────────────────

describe("AlgorithmTracker", () => {
  describe("contract metadata", () => {
    test("name is AlgorithmTracker", () => {
      expect(AlgorithmTracker.name).toBe("AlgorithmTracker");
    });

    test("event is PostToolUse", () => {
      expect(AlgorithmTracker.event).toBe("PostToolUse");
    });
  });

  // ─── accepts() ──────────────────────────────────────────────────────────────

  describe("accepts", () => {
    test("accepts Bash tool", () => {
      expect(AlgorithmTracker.accepts(makeInput({ tool_name: "Bash" }))).toBe(true);
    });

    test("accepts TaskCreate tool", () => {
      expect(AlgorithmTracker.accepts(makeInput({ tool_name: "TaskCreate" }))).toBe(true);
    });

    test("accepts TaskUpdate tool", () => {
      expect(AlgorithmTracker.accepts(makeInput({ tool_name: "TaskUpdate" }))).toBe(true);
    });

    test("accepts Task tool", () => {
      expect(AlgorithmTracker.accepts(makeInput({ tool_name: "Task" }))).toBe(true);
    });

    test("rejects Read tool", () => {
      expect(AlgorithmTracker.accepts(makeInput({ tool_name: "Read" }))).toBe(false);
    });

    test("rejects Write tool", () => {
      expect(AlgorithmTracker.accepts(makeInput({ tool_name: "Write" }))).toBe(false);
    });

    test("rejects Edit tool", () => {
      expect(AlgorithmTracker.accepts(makeInput({ tool_name: "Edit" }))).toBe(false);
    });
  });

  // ─── execute — no session_id ────────────────────────────────────────────────

  describe("execute — no session_id", () => {
    test("returns continue when session_id is empty", () => {
      const deps = makeDeps();
      const result = AlgorithmTracker.execute(makeInput({ session_id: "" }), deps);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe("continue");
        expect(result.value.continue).toBe(true);
      }
    });
  });

  // ─── execute — Bash phase detection ─────────────────────────────────────────

  describe("execute — Bash phase detection", () => {
    test("detects algorithm entry and activates session", () => {
      const messages: string[] = [];
      let writeStateCalled = false;
      const deps = makeDeps({
        readState: () => null,
        writeState: () => { writeStateCalled = true; },
        stderr: (msg) => messages.push(msg),
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the PAI Algorithm"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(writeStateCalled).toBe(true);
      expect(messages.some(m => m.includes("algorithm entry detected"))).toBe(true);
    });

    test("detects phase transition and calls phaseTransition", () => {
      let transitionPhase = "";
      const deps = makeDeps({
        readState: () => null,
        phaseTransition: (_sid, phase) => { transitionPhase = phase; },
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Think phase"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(transitionPhase).toBe("THINK");
    });

    test("calls setPhaseTab on phase transition", () => {
      let tabPhase = "";
      let tabSession = "";
      const deps = makeDeps({
        setPhaseTab: (phase, sid) => { tabPhase = phase; tabSession = sid; },
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Build phase"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(tabPhase).toBe("BUILD");
      expect(tabSession).toBe("test-sess");
    });

    test("logs phase on transition", () => {
      const messages: string[] = [];
      const deps = makeDeps({
        stderr: (msg) => messages.push(msg),
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Verify phase"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(messages.some(m => m.includes("phase: VERIFY"))).toBe(true);
    });

    test("does not detect phase from non-notify Bash commands", () => {
      let transitionCalled = false;
      const deps = makeDeps({
        phaseTransition: () => { transitionCalled = true; },
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: { command: "echo hello" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(transitionCalled).toBe(false);
    });

    test("does not detect phase from Bash with no command", () => {
      let transitionCalled = false;
      const deps = makeDeps({
        phaseTransition: () => { transitionCalled = true; },
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {},
      });
      AlgorithmTracker.execute(input, deps);
      expect(transitionCalled).toBe(false);
    });
  });

  // ─── execute — Bash rework detection ────────────────────────────────────────

  describe("execute — Bash rework detection", () => {
    test("fires rework notification when transitioning from COMPLETE to OBSERVE with criteria", () => {
      let fetchUrl = "";
      let fetchBody = "";
      const deps = makeDeps({
        readState: () => makeState({
          currentPhase: "COMPLETE",
          criteria: [{ id: "C1", description: "test", type: "criterion", status: "completed", createdInPhase: "OBSERVE" }],
        }),
        fetch: (url, opts) => {
          fetchUrl = url as string;
          fetchBody = (opts as RequestInit).body as string;
          return Promise.resolve(new Response());
        },
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Observe phase"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(fetchUrl).toBe("http://localhost:8888/notify");
      expect(fetchBody).toContain("Re-entering algorithm");
    });

    test("fires rework notification when transitioning from LEARN to OBSERVE with summary", () => {
      const messages: string[] = [];
      const deps = makeDeps({
        readState: () => makeState({
          currentPhase: "LEARN",
          summary: "Previous run completed",
          criteria: [],
        }),
        stderr: (msg) => messages.push(msg),
        fetch: () => Promise.resolve(new Response()),
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Observe phase"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(messages.some(m => m.includes("REWORK detected"))).toBe(true);
    });

    test("fires rework notification when transitioning from IDLE to OBSERVE with criteria", () => {
      const messages: string[] = [];
      const deps = makeDeps({
        readState: () => makeState({
          currentPhase: "IDLE",
          criteria: [{ id: "C1", description: "test", type: "criterion", status: "completed", createdInPhase: "OBSERVE" }],
        }),
        stderr: (msg) => messages.push(msg),
        fetch: () => Promise.resolve(new Response()),
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Observe phase"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(messages.some(m => m.includes("REWORK detected"))).toBe(true);
    });

    test("does not fire rework when transitioning from OBSERVE (not COMPLETE/LEARN/IDLE)", () => {
      let fetchCalled = false;
      const deps = makeDeps({
        readState: () => makeState({
          currentPhase: "OBSERVE",
          criteria: [{ id: "C1", description: "test", type: "criterion", status: "pending", createdInPhase: "OBSERVE" }],
        }),
        fetch: () => { fetchCalled = true; return Promise.resolve(new Response()); },
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Observe phase"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(fetchCalled).toBe(false);
    });

    test("does not fire rework when COMPLETE but no prior work", () => {
      let fetchCalled = false;
      const deps = makeDeps({
        readState: () => makeState({
          currentPhase: "COMPLETE",
          criteria: [],
        }),
        fetch: () => { fetchCalled = true; return Promise.resolve(new Response()); },
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Observe phase"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(fetchCalled).toBe(false);
    });

    test("does not fire rework for non-OBSERVE phase transitions", () => {
      let fetchCalled = false;
      const deps = makeDeps({
        readState: () => makeState({
          currentPhase: "COMPLETE",
          criteria: [{ id: "C1", description: "test", type: "criterion", status: "completed", createdInPhase: "OBSERVE" }],
        }),
        fetch: () => { fetchCalled = true; return Promise.resolve(new Response()); },
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Build phase"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(fetchCalled).toBe(false);
    });

    test("uses reworkCount from post-state for notification message", () => {
      let fetchBody = "";
      const deps = makeDeps({
        readState: () => makeState({
          currentPhase: "COMPLETE",
          criteria: [{ id: "C1", description: "test", type: "criterion", status: "completed", createdInPhase: "OBSERVE" }],
          reworkCount: 3,
        }),
        fetch: (_url, opts) => {
          fetchBody = (opts as RequestInit).body as string;
          return Promise.resolve(new Response());
        },
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Observe phase"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(fetchBody).toContain("Rework iteration 3");
    });

    test("defaults reworkCount to 1 when not set in post-state", () => {
      let fetchBody = "";
      const deps = makeDeps({
        readState: () => makeState({
          currentPhase: "COMPLETE",
          criteria: [{ id: "C1", description: "test", type: "criterion", status: "completed", createdInPhase: "OBSERVE" }],
        }),
        fetch: (_url, opts) => {
          fetchBody = (opts as RequestInit).body as string;
          return Promise.resolve(new Response());
        },
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Observe phase"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      // reworkCount is undefined on the state, so ?? 1 yields 1
      expect(fetchBody).toContain("Rework iteration 1");
    });
  });

  // ─── execute — Bash algorithm entry with existing state ─────────────────────

  describe("execute — algorithm entry with existing state", () => {
    test("reactivates existing inactive state on algorithm entry", () => {
      let writtenState: AlgorithmState | null = null;
      const existingState = makeState({ active: false });
      const deps = makeDeps({
        readState: () => existingState,
        writeState: (s) => { writtenState = s; },
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the PAI Algorithm"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(writtenState).not.toBeNull();
      expect(writtenState!.active).toBe(true);
    });

    test("does not rewrite state when already active on algorithm entry", () => {
      let writeCount = 0;
      const deps = makeDeps({
        readState: () => makeState({ active: true }),
        writeState: () => { writeCount++; },
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the PAI Algorithm"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(writeCount).toBe(0);
    });

    test("creates new state on algorithm entry when no state exists", () => {
      let writtenState: AlgorithmState | null = null;
      const deps = makeDeps({
        readState: () => null,
        writeState: (s) => { writtenState = s; },
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the PAI Algorithm"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(writtenState).not.toBeNull();
      expect(writtenState!.active).toBe(true);
      expect(writtenState!.sessionId).toBe("test-sess");
      expect(writtenState!.currentPhase).toBe("OBSERVE");
    });
  });

  // ─── execute — session name resolution ──────────────────────────────────────

  describe("execute — session name resolution", () => {
    test("uses session name from session-names.json when available", () => {
      let writtenState: AlgorithmState | null = null;
      const deps = makeDeps({
        readState: () => null,
        writeState: (s) => { writtenState = s; },
        readJson: () => ok({ "test-sess": "My Algorithm Run" }),
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the PAI Algorithm"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(writtenState!.taskDescription).toBe("My Algorithm Run");
    });

    test("falls back to truncated session_id when session-names.json read fails", () => {
      let writtenState: AlgorithmState | null = null;
      const deps = makeDeps({
        readState: () => null,
        writeState: (s) => { writtenState = s; },
        readJson: () => err(fileReadFailed("test", new Error("not found"))),
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the PAI Algorithm"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(writtenState!.taskDescription).toBe("test-ses");
    });

    test("falls back to truncated session_id when session not in names map", () => {
      let writtenState: AlgorithmState | null = null;
      const deps = makeDeps({
        readState: () => null,
        writeState: (s) => { writtenState = s; },
        readJson: () => ok({ "other-sess": "Other Run" }),
      });
      const input = makeInput({
        tool_name: "Bash",
        tool_input: {
          command: 'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the PAI Algorithm"}\'',
        },
      });
      AlgorithmTracker.execute(input, deps);
      expect(writtenState!.taskDescription).toBe("test-ses");
    });
  });

  // ─── execute — TaskCreate criteria tracking ─────────────────────────────────

  describe("execute — TaskCreate criteria tracking", () => {
    test("adds criterion from task subject with ISC-C pattern", () => {
      let addedCriterion: AlgorithmCriterion | null = null;
      const deps = makeDeps({
        readState: () => makeState(),
        criteriaAdd: (_sid, c) => { addedCriterion = c; },
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: { subject: "ISC-C1: Must handle errors" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(addedCriterion).not.toBeNull();
      expect(addedCriterion!.id).toBe("C1");
      expect(addedCriterion!.description).toBe("Must handle errors");
      expect(addedCriterion!.type).toBe("criterion");
      expect(addedCriterion!.status).toBe("pending");
    });

    test("adds anti-criterion from task subject with ISC-A pattern", () => {
      let addedCriterion: AlgorithmCriterion | null = null;
      const deps = makeDeps({
        readState: () => makeState(),
        criteriaAdd: (_sid, c) => { addedCriterion = c; },
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: { subject: "ISC-A1: Must not crash" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(addedCriterion!.type).toBe("anti-criterion");
    });

    test("extracts taskId from tool_result", () => {
      let addedCriterion: AlgorithmCriterion | null = null;
      const deps = makeDeps({
        readState: () => makeState(),
        criteriaAdd: (_sid, c) => { addedCriterion = c; },
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: { subject: "ISC-C1: Must handle errors" },
        tool_result: "Task #42 created successfully",
      });
      AlgorithmTracker.execute(input, deps);
      expect(addedCriterion!.taskId).toBe("42");
    });

    test("falls back to parsing tool_result when subject has no criterion", () => {
      let addedCriterion: AlgorithmCriterion | null = null;
      const deps = makeDeps({
        readState: () => makeState(),
        criteriaAdd: (_sid, c) => { addedCriterion = c; },
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: { subject: "just a title" },
        tool_result: "Task #5 created successfully: ISC-C2: Validate input",
      });
      AlgorithmTracker.execute(input, deps);
      expect(addedCriterion).not.toBeNull();
      expect(addedCriterion!.id).toBe("C2");
      expect(addedCriterion!.description).toBe("Validate input");
    });

    test("does not add criterion when subject and result have no ISC pattern", () => {
      let addCalled = false;
      const deps = makeDeps({
        criteriaAdd: () => { addCalled = true; },
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: { subject: "plain task" },
        tool_result: "Task #1 created successfully",
      });
      AlgorithmTracker.execute(input, deps);
      expect(addCalled).toBe(false);
    });

    test("does not add criterion when no subject and result has no ISC", () => {
      let addCalled = false;
      const deps = makeDeps({
        criteriaAdd: () => { addCalled = true; },
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: {},
      });
      AlgorithmTracker.execute(input, deps);
      expect(addCalled).toBe(false);
    });

    test("uses currentPhase from state for createdInPhase", () => {
      let addedCriterion: AlgorithmCriterion | null = null;
      const deps = makeDeps({
        readState: () => makeState({ currentPhase: "PLAN" }),
        criteriaAdd: (_sid, c) => { addedCriterion = c; },
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: { subject: "ISC-C1: Test" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(addedCriterion!.createdInPhase).toBe("PLAN");
    });

    test("defaults createdInPhase to OBSERVE when no state", () => {
      let addedCriterion: AlgorithmCriterion | null = null;
      const deps = makeDeps({
        readState: () => null,
        criteriaAdd: (_sid, c) => { addedCriterion = c; },
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: { subject: "ISC-C1: Test" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(addedCriterion!.createdInPhase).toBe("OBSERVE");
    });

    test("does not set taskId when tool_result has no task number", () => {
      let addedCriterion: AlgorithmCriterion | null = null;
      const deps = makeDeps({
        readState: () => makeState(),
        criteriaAdd: (_sid, c) => { addedCriterion = c; },
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: { subject: "ISC-C1: Test" },
        tool_result: "no task number here",
      });
      AlgorithmTracker.execute(input, deps);
      expect(addedCriterion!.taskId).toBeUndefined();
    });
  });

  // ─── execute — TaskCreate effort level inference ────────────────────────────

  describe("execute — TaskCreate effort level inference", () => {
    test("infers Extended when criteria count reaches 12", () => {
      let inferredLevel = "";
      const deps = makeDeps({
        readState: () => makeState({
          sla: "Standard",
          criteria: new Array(12).fill({ id: "X", description: "x", type: "criterion" as const, status: "pending" as const, createdInPhase: "OBSERVE" as const }),
        }),
        criteriaAdd: () => {},
        effortLevelUpdate: (_sid, level) => { inferredLevel = level; },
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: { subject: "ISC-C13: Something" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(inferredLevel).toBe("Extended");
    });

    test("infers Advanced when criteria count reaches 20", () => {
      let inferredLevel = "";
      const deps = makeDeps({
        readState: () => makeState({
          sla: "Standard",
          criteria: new Array(20).fill({ id: "X", description: "x", type: "criterion" as const, status: "pending" as const, createdInPhase: "OBSERVE" as const }),
        }),
        criteriaAdd: () => {},
        effortLevelUpdate: (_sid, level) => { inferredLevel = level; },
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: { subject: "ISC-C21: Something" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(inferredLevel).toBe("Advanced");
    });

    test("infers Deep when criteria count reaches 40", () => {
      let inferredLevel = "";
      const deps = makeDeps({
        readState: () => makeState({
          sla: "Standard",
          criteria: new Array(40).fill({ id: "X", description: "x", type: "criterion" as const, status: "pending" as const, createdInPhase: "OBSERVE" as const }),
        }),
        criteriaAdd: () => {},
        effortLevelUpdate: (_sid, level) => { inferredLevel = level; },
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: { subject: "ISC-C41: Something" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(inferredLevel).toBe("Deep");
    });

    test("does not infer effort level when sla is not Standard", () => {
      let effortCalled = false;
      const deps = makeDeps({
        readState: () => makeState({
          sla: "Extended",
          criteria: new Array(20).fill({ id: "X", description: "x", type: "criterion" as const, status: "pending" as const, createdInPhase: "OBSERVE" as const }),
        }),
        criteriaAdd: () => {},
        effortLevelUpdate: () => { effortCalled = true; },
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: { subject: "ISC-C21: Something" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(effortCalled).toBe(false);
    });

    test("does not infer effort level when criteria count is below 12", () => {
      let effortCalled = false;
      const deps = makeDeps({
        readState: () => makeState({
          sla: "Standard",
          criteria: new Array(5).fill({ id: "X", description: "x", type: "criterion" as const, status: "pending" as const, createdInPhase: "OBSERVE" as const }),
        }),
        criteriaAdd: () => {},
        effortLevelUpdate: () => { effortCalled = true; },
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: { subject: "ISC-C6: Something" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(effortCalled).toBe(false);
    });

    test("does not infer effort level when readState returns null after add", () => {
      let effortCalled = false;
      const deps = makeDeps({
        readState: () => null,
        criteriaAdd: () => {},
        effortLevelUpdate: () => { effortCalled = true; },
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: { subject: "ISC-C1: Something" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(effortCalled).toBe(false);
    });

    test("logs effort level inference", () => {
      const messages: string[] = [];
      const deps = makeDeps({
        readState: () => makeState({
          sla: "Standard",
          criteria: new Array(12).fill({ id: "X", description: "x", type: "criterion" as const, status: "pending" as const, createdInPhase: "OBSERVE" as const }),
        }),
        criteriaAdd: () => {},
        effortLevelUpdate: () => {},
        stderr: (msg) => messages.push(msg),
      });
      const input = makeInput({
        tool_name: "TaskCreate",
        tool_input: { subject: "ISC-C13: Something" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(messages.some(m => m.includes("effort level inferred"))).toBe(true);
    });
  });

  // ─── execute — TaskUpdate criteria status ───────────────────────────────────

  describe("execute — TaskUpdate criteria status", () => {
    test("calls criteriaUpdate with mapped status for completed", () => {
      let updateArgs: { taskId: string; status: string } | null = null;
      const deps = makeDeps({
        criteriaUpdate: (_sid, taskId, status) => {
          updateArgs = { taskId, status };
        },
      });
      const input = makeInput({
        tool_name: "TaskUpdate",
        tool_input: { taskId: "42", status: "completed" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(updateArgs).not.toBeNull();
      expect(updateArgs!.taskId).toBe("42");
      expect(updateArgs!.status).toBe("completed");
    });

    test("maps deleted status to failed", () => {
      let mappedStatus = "";
      const deps = makeDeps({
        criteriaUpdate: (_sid, _taskId, status) => { mappedStatus = status; },
      });
      const input = makeInput({
        tool_name: "TaskUpdate",
        tool_input: { taskId: "42", status: "deleted" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(mappedStatus).toBe("failed");
    });

    test("maps in_progress status", () => {
      let mappedStatus = "";
      const deps = makeDeps({
        criteriaUpdate: (_sid, _taskId, status) => { mappedStatus = status; },
      });
      const input = makeInput({
        tool_name: "TaskUpdate",
        tool_input: { taskId: "42", status: "in_progress" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(mappedStatus).toBe("in_progress");
    });

    test("maps pending status", () => {
      let mappedStatus = "";
      const deps = makeDeps({
        criteriaUpdate: (_sid, _taskId, status) => { mappedStatus = status; },
      });
      const input = makeInput({
        tool_name: "TaskUpdate",
        tool_input: { taskId: "42", status: "pending" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(mappedStatus).toBe("pending");
    });

    test("does not call criteriaUpdate for unknown status", () => {
      let updateCalled = false;
      const deps = makeDeps({
        criteriaUpdate: () => { updateCalled = true; },
      });
      const input = makeInput({
        tool_name: "TaskUpdate",
        tool_input: { taskId: "42", status: "unknown_status" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(updateCalled).toBe(false);
    });

    test("does not call criteriaUpdate when taskId is missing", () => {
      let updateCalled = false;
      const deps = makeDeps({
        criteriaUpdate: () => { updateCalled = true; },
      });
      const input = makeInput({
        tool_name: "TaskUpdate",
        tool_input: { status: "completed" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(updateCalled).toBe(false);
    });

    test("does not call criteriaUpdate when status is missing", () => {
      let updateCalled = false;
      const deps = makeDeps({
        criteriaUpdate: () => { updateCalled = true; },
      });
      const input = makeInput({
        tool_name: "TaskUpdate",
        tool_input: { taskId: "42" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(updateCalled).toBe(false);
    });
  });

  // ─── execute — Task agent spawns ────────────────────────────────────────────

  describe("execute — Task agent spawns", () => {
    test("adds agent with name from tool_input.name", () => {
      let addedAgent: { name: string; agentType: string; task: string } | null = null;
      const deps = makeDeps({
        agentAdd: (_sid, agent) => { addedAgent = agent; },
      });
      const input = makeInput({
        tool_name: "Task",
        tool_input: { name: "CodeReviewer", subagent_type: "reviewer", description: "Review PR" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(addedAgent).not.toBeNull();
      expect(addedAgent!.name).toBe("CodeReviewer");
      expect(addedAgent!.agentType).toBe("reviewer");
      expect(addedAgent!.task).toBe("Review PR");
    });

    test("falls back to description for name when name is missing", () => {
      let addedAgent: { name: string; agentType: string; task: string } | null = null;
      const deps = makeDeps({
        agentAdd: (_sid, agent) => { addedAgent = agent; },
      });
      const input = makeInput({
        tool_name: "Task",
        tool_input: { description: "Build feature" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(addedAgent!.name).toBe("Build feature");
    });

    test("falls back to unnamed when both name and description are missing", () => {
      let addedAgent: { name: string; agentType: string; task: string } | null = null;
      const deps = makeDeps({
        agentAdd: (_sid, agent) => { addedAgent = agent; },
      });
      const input = makeInput({
        tool_name: "Task",
        tool_input: { prompt: "Do something important for the project right now" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(addedAgent!.name).toBe("unnamed");
    });

    test("falls back to general-purpose for agentType when not specified", () => {
      let addedAgent: { name: string; agentType: string; task: string } | null = null;
      const deps = makeDeps({
        agentAdd: (_sid, agent) => { addedAgent = agent; },
      });
      const input = makeInput({
        tool_name: "Task",
        tool_input: { name: "Worker" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(addedAgent!.agentType).toBe("general-purpose");
    });

    test("uses prompt (truncated to 80 chars) for task when description is missing", () => {
      let addedAgent: { name: string; agentType: string; task: string } | null = null;
      const deps = makeDeps({
        agentAdd: (_sid, agent) => { addedAgent = agent; },
      });
      const longPrompt = "A".repeat(100);
      const input = makeInput({
        tool_name: "Task",
        tool_input: { name: "Worker", prompt: longPrompt },
      });
      AlgorithmTracker.execute(input, deps);
      expect(addedAgent!.task).toBe("A".repeat(80));
    });

    test("uses empty string for task when both description and prompt are missing", () => {
      let addedAgent: { name: string; agentType: string; task: string } | null = null;
      const deps = makeDeps({
        agentAdd: (_sid, agent) => { addedAgent = agent; },
      });
      const input = makeInput({
        tool_name: "Task",
        tool_input: { name: "Worker" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(addedAgent!.task).toBe("");
    });

    test("logs agent spawn", () => {
      const messages: string[] = [];
      const deps = makeDeps({
        agentAdd: () => {},
        stderr: (msg) => messages.push(msg),
      });
      const input = makeInput({
        tool_name: "Task",
        tool_input: { name: "CodeReviewer", subagent_type: "reviewer" },
      });
      AlgorithmTracker.execute(input, deps);
      expect(messages.some(m => m.includes("agent spawned: CodeReviewer"))).toBe(true);
    });

    test("does not add agent when tool_input is falsy", () => {
      let addCalled = false;
      const deps = makeDeps({
        agentAdd: () => { addCalled = true; },
      });
      // Task with empty tool_input should still be handled by the else-if
      // because tool_input is {} which is truthy. Test with a null-ish scenario:
      // Actually the contract checks `tool_input` truthiness. {} is truthy.
      // The only way to not match is if tool_input is null/undefined.
      const input = makeInput({
        tool_name: "Task",
        tool_input: undefined as unknown as Record<string, unknown>,
      });
      AlgorithmTracker.execute(input, deps);
      expect(addCalled).toBe(false);
    });
  });

  // ─── execute — always returns continue ──────────────────────────────────────

  describe("execute — return value", () => {
    test("always returns ok continue for all tool types", () => {
      const deps = makeDeps();
      for (const tool of ["Bash", "TaskCreate", "TaskUpdate", "Task"]) {
        const result = AlgorithmTracker.execute(
          makeInput({ tool_name: tool, tool_input: {} }),
          deps,
        );
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe("continue");
          expect(result.value.continue).toBe(true);
        }
      }
    });
  });
});

// ─── detectPhaseFromBash pure function tests ──────────────────────────────────

describe("detectPhaseFromBash", () => {
  test("returns null phase for non-notify commands", () => {
    const result = detectPhaseFromBash("echo hello");
    expect(result.phase).toBeNull();
    expect(result.isAlgorithmEntry).toBe(false);
  });

  test("returns null phase when URL has localhost:8888 but no /notify", () => {
    const result = detectPhaseFromBash('curl http://localhost:8888/status');
    expect(result.phase).toBeNull();
    expect(result.isAlgorithmEntry).toBe(false);
  });

  test("returns null phase when /notify is present but not localhost:8888", () => {
    const result = detectPhaseFromBash('curl http://otherhost:8888/notify');
    expect(result.phase).toBeNull();
  });

  test("returns null phase when no message field in JSON", () => {
    const result = detectPhaseFromBash('curl http://localhost:8888/notify -d \'{"data":"test"}\'');
    expect(result.phase).toBeNull();
    expect(result.isAlgorithmEntry).toBe(false);
  });

  test("detects algorithm entry", () => {
    const result = detectPhaseFromBash(
      'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the PAI Algorithm"}\''
    );
    expect(result.phase).toBeNull();
    expect(result.isAlgorithmEntry).toBe(true);
  });

  test("detects OBSERVE phase", () => {
    const result = detectPhaseFromBash(
      'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Observe phase"}\''
    );
    expect(result.phase).toBe("OBSERVE");
    expect(result.isAlgorithmEntry).toBe(false);
  });

  test("detects THINK phase", () => {
    const result = detectPhaseFromBash(
      'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Think phase"}\''
    );
    expect(result.phase).toBe("THINK");
  });

  test("detects PLAN phase", () => {
    const result = detectPhaseFromBash(
      'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Plan phase"}\''
    );
    expect(result.phase).toBe("PLAN");
  });

  test("detects BUILD phase", () => {
    const result = detectPhaseFromBash(
      'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Build phase"}\''
    );
    expect(result.phase).toBe("BUILD");
  });

  test("detects EXECUTE phase", () => {
    const result = detectPhaseFromBash(
      'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Execute phase"}\''
    );
    expect(result.phase).toBe("EXECUTE");
  });

  test("detects VERIFY phase without period", () => {
    const result = detectPhaseFromBash(
      'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Verify phase"}\''
    );
    expect(result.phase).toBe("VERIFY");
  });

  test("detects VERIFY phase with period", () => {
    const result = detectPhaseFromBash(
      'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Verify phase."}\''
    );
    expect(result.phase).toBe("VERIFY");
  });

  test("detects LEARN phase", () => {
    const result = detectPhaseFromBash(
      'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Learn phase"}\''
    );
    expect(result.phase).toBe("LEARN");
  });

  test("returns null for unrecognized phase in notify", () => {
    const result = detectPhaseFromBash(
      'curl -X POST http://localhost:8888/notify -d \'{"message":"Entering the Unknown phase"}\''
    );
    expect(result.phase).toBeNull();
    expect(result.isAlgorithmEntry).toBe(false);
  });

  test("is case insensitive for phase detection", () => {
    const result = detectPhaseFromBash(
      'curl -X POST http://localhost:8888/notify -d \'{"message":"ENTERING THE THINK PHASE"}\''
    );
    expect(result.phase).toBe("THINK");
  });
});

// ─── parseCriterion pure function tests ───────────────────────────────────────

describe("parseCriterion", () => {
  test("parses ISC-C pattern", () => {
    const result = parseCriterion("ISC-C1: Must handle errors");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("C1");
    expect(result!.description).toBe("Must handle errors");
  });

  test("parses ISC-A pattern", () => {
    const result = parseCriterion("ISC-A1: Must not crash");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("A1");
  });

  test("parses ISC with complex id pattern", () => {
    const result = parseCriterion("ISC-test-1: Complex criterion");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("test-1");
  });

  test("parses ISC-A-prefixed pattern", () => {
    const result = parseCriterion("ISC-A-test-1: Anti criterion");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("A-test-1");
  });

  test("parses bare C-pattern at start of line", () => {
    const result = parseCriterion("C1: Simple criterion");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("C1");
  });

  test("parses bare A-pattern at start of line", () => {
    const result = parseCriterion("A1: Anti criterion");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("A1");
  });

  test("trims whitespace from description", () => {
    const result = parseCriterion("ISC-C1:   extra spaces  ");
    expect(result).not.toBeNull();
    expect(result!.description).toBe("extra spaces");
  });

  test("returns null for non-matching text", () => {
    const result = parseCriterion("This is just regular text");
    expect(result).toBeNull();
  });

  test("returns null for empty string", () => {
    const result = parseCriterion("");
    expect(result).toBeNull();
  });
});
