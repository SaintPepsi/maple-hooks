/**
 * Tests for AlgorithmTracker contract:
 *   - detectPhaseFromBash (pure function)
 *   - parseCriterion (pure function)
 *   - accepts
 *   - execute branches: Bash, TaskCreate, TaskUpdate, Task
 */

import { describe, expect, test } from "bun:test";
import { ok } from "@hooks/core/result";
import type { ToolHookInput } from "@hooks/core/types/hook-inputs";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Extends ToolHookInput with the raw tool_result field written by the Claude SDK. */
type ToolHookInputWithResult = ToolHookInput & { tool_result: string };

import type { AlgorithmCriterion, AlgorithmState } from "@hooks/lib/algorithm-state";
import {
  AlgorithmTracker,
  type AlgorithmTrackerDeps,
  detectPhaseFromBash,
  parseCriterion,
} from "./AlgorithmTracker.contract";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeNotifyCommand(message: string): string {
  return `curl -s -X POST http://localhost:8888/notify -H 'Content-Type: application/json' -d '{"message": "${message}", "voice_id": "test"}'`;
}

function makeState(overrides: Partial<AlgorithmState> = {}): AlgorithmState {
  return {
    active: true,
    sessionId: "test-session",
    taskDescription: "Test task",
    currentPhase: "OBSERVE",
    phaseStartedAt: 1000,
    algorithmStartedAt: 1000,
    sla: "Standard",
    criteria: [],
    agents: [],
    capabilities: ["Task Tool"],
    phaseHistory: [{ phase: "OBSERVE", startedAt: 1000, criteriaCount: 0, agentCount: 0 }],
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
    fileExists: () => false,
    readJson: (<T>(_path: string) => ok({} as T)) as AlgorithmTrackerDeps["readJson"],
    fetch: globalThis.fetch,
    baseDir: "/mock/pai",
    voiceId: "test-voice",
    stderr: () => {},
    ...overrides,
  };
}

function makeBashInput(command: string, sessionId = "test-session"): ToolHookInput {
  return {
    session_id: sessionId,
    tool_name: "Bash",
    tool_input: { command },
  };
}

// ─── detectPhaseFromBash ─────────────────────────────────────────────────────

describe("detectPhaseFromBash", () => {
  describe("phase detection — all 7 phases", () => {
    test("detects OBSERVE phase", () => {
      const result = detectPhaseFromBash(makeNotifyCommand("Entering the OBSERVE phase"));
      expect(result.phase).toBe("OBSERVE");
      expect(result.isAlgorithmEntry).toBe(false);
    });

    test("detects THINK phase", () => {
      const result = detectPhaseFromBash(makeNotifyCommand("Entering the THINK phase"));
      expect(result.phase).toBe("THINK");
      expect(result.isAlgorithmEntry).toBe(false);
    });

    test("detects PLAN phase", () => {
      const result = detectPhaseFromBash(makeNotifyCommand("Entering the PLAN phase"));
      expect(result.phase).toBe("PLAN");
      expect(result.isAlgorithmEntry).toBe(false);
    });

    test("detects BUILD phase", () => {
      const result = detectPhaseFromBash(makeNotifyCommand("Entering the BUILD phase"));
      expect(result.phase).toBe("BUILD");
      expect(result.isAlgorithmEntry).toBe(false);
    });

    test("detects EXECUTE phase", () => {
      const result = detectPhaseFromBash(makeNotifyCommand("Entering the EXECUTE phase"));
      expect(result.phase).toBe("EXECUTE");
      expect(result.isAlgorithmEntry).toBe(false);
    });

    test("detects VERIFY phase", () => {
      const result = detectPhaseFromBash(makeNotifyCommand("Entering the VERIFY phase"));
      expect(result.phase).toBe("VERIFY");
      expect(result.isAlgorithmEntry).toBe(false);
    });

    test("detects LEARN phase", () => {
      const result = detectPhaseFromBash(makeNotifyCommand("Entering the LEARN phase"));
      expect(result.phase).toBe("LEARN");
      expect(result.isAlgorithmEntry).toBe(false);
    });
  });

  describe("algorithm entry detection", () => {
    test("detects algorithm entry message", () => {
      const result = detectPhaseFromBash(makeNotifyCommand("Entering the PAI Algorithm"));
      expect(result.phase).toBeNull();
      expect(result.isAlgorithmEntry).toBe(true);
    });
  });

  describe("no-match cases", () => {
    test("returns null phase for non-notify command", () => {
      const result = detectPhaseFromBash("ls -la /tmp");
      expect(result.phase).toBeNull();
      expect(result.isAlgorithmEntry).toBe(false);
    });

    test("returns null phase when missing /notify path", () => {
      const cmd = `curl http://localhost:8888/other -d '{"message": "entering the observe phase"}'`;
      const result = detectPhaseFromBash(cmd);
      expect(result.phase).toBeNull();
      expect(result.isAlgorithmEntry).toBe(false);
    });

    test("returns null phase when missing localhost:8888", () => {
      const cmd = `curl http://example.com/notify -d '{"message": "entering the observe phase"}'`;
      const result = detectPhaseFromBash(cmd);
      expect(result.phase).toBeNull();
      expect(result.isAlgorithmEntry).toBe(false);
    });

    test("returns null phase for unrecognized notify message", () => {
      const result = detectPhaseFromBash(makeNotifyCommand("Some unrelated notification"));
      expect(result.phase).toBeNull();
      expect(result.isAlgorithmEntry).toBe(false);
    });
  });
});

// ─── parseCriterion ──────────────────────────────────────────────────────────

describe("parseCriterion", () => {
  describe("ISC-style IDs", () => {
    test("parses ISC-C style criterion", () => {
      const result = parseCriterion("ISC-C1: All tests pass");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("C1");
      expect(result!.description).toBe("All tests pass");
    });

    test("parses ISC-A style anti-criterion", () => {
      const result = parseCriterion("ISC-A2: No regressions introduced");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("A2");
      expect(result!.description).toBe("No regressions introduced");
    });

    test("parses ISC with multi-word ID", () => {
      const result = parseCriterion("ISC-SEC-1: Security audit passes");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("SEC-1");
      expect(result!.description).toBe("Security audit passes");
    });
  });

  describe("bare IDs", () => {
    test("parses bare C-prefixed criterion", () => {
      const result = parseCriterion("C3: Implementation complete");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("C3");
      expect(result!.description).toBe("Implementation complete");
    });

    test("parses bare A-prefixed anti-criterion", () => {
      const result = parseCriterion("A1: No breaking changes");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("A1");
      expect(result!.description).toBe("No breaking changes");
    });
  });

  describe("null cases", () => {
    test("returns null for plain text", () => {
      expect(parseCriterion("Just a description with no ID")).toBeNull();
    });

    test("returns null for empty string", () => {
      expect(parseCriterion("")).toBeNull();
    });
  });
});

// ─── accepts ─────────────────────────────────────────────────────────────────

describe("AlgorithmTracker.accepts", () => {
  const makeInput = (tool: string): ToolHookInput => ({
    session_id: "test-session",
    tool_name: tool,
    tool_input: {},
  });

  test("accepts Bash", () => {
    expect(AlgorithmTracker.accepts(makeInput("Bash"))).toBe(true);
  });

  test("accepts TaskCreate", () => {
    expect(AlgorithmTracker.accepts(makeInput("TaskCreate"))).toBe(true);
  });

  test("accepts TaskUpdate", () => {
    expect(AlgorithmTracker.accepts(makeInput("TaskUpdate"))).toBe(true);
  });

  test("accepts Task", () => {
    expect(AlgorithmTracker.accepts(makeInput("Task"))).toBe(true);
  });

  test("rejects Write", () => {
    expect(AlgorithmTracker.accepts(makeInput("Write"))).toBe(false);
  });

  test("rejects Read", () => {
    expect(AlgorithmTracker.accepts(makeInput("Read"))).toBe(false);
  });

  test("rejects Agent", () => {
    expect(AlgorithmTracker.accepts(makeInput("Agent"))).toBe(false);
  });
});

// ─── execute — Bash branch ────────────────────────────────────────────────────

describe("AlgorithmTracker.execute — Bash", () => {
  test("returns ok({continue: true}) for non-notify Bash", () => {
    const input = makeBashInput("ls -la /tmp");
    const result = AlgorithmTracker.execute(input, makeDeps());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.continue).toBe(true);
  });

  test("calls phaseTransition when a phase is detected", () => {
    let transitioned = "";
    const deps = makeDeps({
      readState: () => makeState(),
      phaseTransition: (_sid, phase) => {
        transitioned = phase;
      },
    });
    const input = makeBashInput(makeNotifyCommand("Entering the PLAN phase"));
    AlgorithmTracker.execute(input, deps);
    expect(transitioned).toBe("PLAN");
  });

  test("calls ensureSessionActive (writeState) on algorithm entry — new session", () => {
    let written = false;
    const deps = makeDeps({
      readState: () => null,
      writeState: () => {
        written = true;
      },
    });
    const input = makeBashInput(makeNotifyCommand("Entering the PAI Algorithm"));
    AlgorithmTracker.execute(input, deps);
    expect(written).toBe(true);
  });

  test("reactivates existing inactive session — sets active: true and clears completedAt/summary", () => {
    let writtenState: AlgorithmState | null = null;
    const inactiveState = makeState({ active: false, completedAt: 99999, summary: "old summary" });
    const deps = makeDeps({
      readState: () => inactiveState,
      writeState: (s) => {
        writtenState = s;
      },
    });
    const input = makeBashInput(makeNotifyCommand("Entering the PAI Algorithm"));
    AlgorithmTracker.execute(input, deps);
    expect(writtenState).not.toBeNull();
    expect(writtenState!.active).toBe(true);
    expect(writtenState!.completedAt).toBeUndefined();
    expect(writtenState!.summary).toBeUndefined();
  });

  test("detects rework transition (OBSERVE after COMPLETE with criteria) — asserts fetch body", () => {
    let phaseCalled = "";
    let fetchBody = "";
    const completeState = makeState({
      currentPhase: "COMPLETE",
      criteria: [
        {
          id: "C1",
          description: "done",
          type: "criterion",
          status: "completed",
          createdInPhase: "BUILD",
        },
      ],
      reworkCount: 1,
    });

    const mockFetch = ((_url: RequestInfo | URL, init?: RequestInit) => {
      fetchBody = (init?.body as string) ?? "";
      return Promise.resolve(new Response());
    }) as typeof globalThis.fetch;

    const deps = makeDeps({
      readState: () => completeState,
      phaseTransition: (_sid, phase) => {
        phaseCalled = phase;
      },
      fetch: mockFetch,
    });

    const input = makeBashInput(makeNotifyCommand("Entering the OBSERVE phase"));
    const result = AlgorithmTracker.execute(input, deps);
    expect(result.ok).toBe(true);
    expect(phaseCalled).toBe("OBSERVE");
    expect(fetchBody).toContain("Rework iteration");
  });

  test("detects rework transition after LEARN phase with criteria", () => {
    let phaseCalled = "";
    let fetchBody = "";
    const learnState = makeState({
      currentPhase: "LEARN",
      criteria: [
        {
          id: "C1",
          description: "done",
          type: "criterion",
          status: "completed",
          createdInPhase: "BUILD",
        },
      ],
      reworkCount: 2,
    });

    const mockFetch = ((_url: RequestInfo | URL, init?: RequestInit) => {
      fetchBody = (init?.body as string) ?? "";
      return Promise.resolve(new Response());
    }) as typeof globalThis.fetch;

    const deps = makeDeps({
      readState: () => learnState,
      phaseTransition: (_sid, phase) => {
        phaseCalled = phase;
      },
      fetch: mockFetch,
    });

    const input = makeBashInput(makeNotifyCommand("Entering the OBSERVE phase"));
    AlgorithmTracker.execute(input, deps);
    expect(phaseCalled).toBe("OBSERVE");
    expect(fetchBody).toContain("Rework iteration");
  });

  test("detects rework transition after IDLE phase with criteria", () => {
    let phaseCalled = "";
    let fetchBody = "";
    const idleState = makeState({
      currentPhase: "IDLE",
      criteria: [
        {
          id: "C1",
          description: "done",
          type: "criterion",
          status: "completed",
          createdInPhase: "BUILD",
        },
      ],
      reworkCount: 1,
    });

    const mockFetch = ((_url: RequestInfo | URL, init?: RequestInit) => {
      fetchBody = (init?.body as string) ?? "";
      return Promise.resolve(new Response());
    }) as typeof globalThis.fetch;

    const deps = makeDeps({
      readState: () => idleState,
      phaseTransition: (_sid, phase) => {
        phaseCalled = phase;
      },
      fetch: mockFetch,
    });

    const input = makeBashInput(makeNotifyCommand("Entering the OBSERVE phase"));
    AlgorithmTracker.execute(input, deps);
    expect(phaseCalled).toBe("OBSERVE");
    expect(fetchBody).toContain("Rework iteration");
  });

  test("skips when no session_id", () => {
    const input: ToolHookInput = {
      session_id: "",
      tool_name: "Bash",
      tool_input: { command: makeNotifyCommand("Entering the OBSERVE phase") },
    };
    const result = AlgorithmTracker.execute(input, makeDeps());
    // contract returns ok({ continue: true }) when session_id is falsy
    // (AlgorithmTracker.contract.ts line 182)
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.continue).toBe(true);
  });
});

// ─── execute — TaskCreate branch ─────────────────────────────────────────────

describe("AlgorithmTracker.execute — TaskCreate", () => {
  test("adds criterion from subject field — full criterion object", () => {
    let addedCriterion: AlgorithmCriterion | null = null;
    const deps = makeDeps({
      readState: () => makeState({ currentPhase: "OBSERVE" }),
      criteriaAdd: (_sid, c) => {
        addedCriterion = c;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "TaskCreate",
      tool_input: { subject: "ISC-C5: The output includes all required fields" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(addedCriterion).not.toBeNull();
    expect(addedCriterion!.id).toBe("C5");
    expect(addedCriterion!.description).toBe("The output includes all required fields");
    expect(addedCriterion!.type).toBe("criterion");
    expect(addedCriterion!.status).toBe("pending");
    expect(addedCriterion!.createdInPhase).toBe("OBSERVE");
    expect(addedCriterion!.taskId).toBeUndefined();
  });

  test("parses taskId and criterion id from tool_result", () => {
    let addedCriterion: AlgorithmCriterion | null = null;
    const deps = makeDeps({
      readState: () => makeState({ currentPhase: "OBSERVE" }),
      criteriaAdd: (_sid, c) => {
        addedCriterion = c;
      },
    });
    const input: ToolHookInputWithResult = {
      session_id: "test-session",
      tool_name: "TaskCreate",
      tool_input: {},
      tool_result: "Task #42 created successfully: ISC-C7: Output validated",
    };
    AlgorithmTracker.execute(input, deps);
    expect(addedCriterion).not.toBeNull();
    expect(addedCriterion!.taskId).toBe("42");
    expect(addedCriterion!.id).toBe("C7");
    expect(addedCriterion!.description).toBe("Output validated");
    expect(addedCriterion!.type).toBe("criterion");
    expect(addedCriterion!.status).toBe("pending");
  });

  test("detects anti-criterion type for A-prefixed id", () => {
    let addedCriterion: AlgorithmCriterion | null = null;
    const deps = makeDeps({
      readState: () => makeState(),
      criteriaAdd: (_sid, c) => {
        addedCriterion = c;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "TaskCreate",
      tool_input: { subject: "ISC-A3: No regressions" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(addedCriterion).not.toBeNull();
    expect(addedCriterion!.id).toBe("A3");
    expect(addedCriterion!.description).toBe("No regressions");
    expect(addedCriterion!.type).toBe("anti-criterion");
  });

  test("upgrades SLA to Extended at 12 criteria", () => {
    let upgradedTo = "";
    // After criteriaAdd, readState is called again and should return 12 criteria
    const stateWith12 = makeState({
      sla: "Standard",
      criteria: Array.from({ length: 12 }, (_, i) => ({
        id: `C${i + 1}`,
        description: `Criterion ${i + 1}`,
        type: "criterion" as const,
        status: "pending" as const,
        createdInPhase: "OBSERVE" as const,
      })),
    });
    let readCount = 0;
    const deps = makeDeps({
      readState: () => {
        readCount++;
        return readCount === 1 ? makeState() : stateWith12;
      },
      effortLevelUpdate: (_sid, level) => {
        upgradedTo = level;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "TaskCreate",
      tool_input: { subject: "ISC-C12: Twelfth criterion" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(upgradedTo).toBe("Extended");
  });

  test("upgrades SLA to Advanced at 20 criteria", () => {
    let upgradedTo = "";
    const stateWith20 = makeState({
      sla: "Standard",
      criteria: Array.from({ length: 20 }, (_, i) => ({
        id: `C${i + 1}`,
        description: `Criterion ${i + 1}`,
        type: "criterion" as const,
        status: "pending" as const,
        createdInPhase: "OBSERVE" as const,
      })),
    });
    let readCount = 0;
    const deps = makeDeps({
      readState: () => {
        readCount++;
        return readCount === 1 ? makeState() : stateWith20;
      },
      effortLevelUpdate: (_sid, level) => {
        upgradedTo = level;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "TaskCreate",
      tool_input: { subject: "ISC-C20: Twentieth criterion" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(upgradedTo).toBe("Advanced");
  });

  test("upgrades SLA to Deep at 40 criteria", () => {
    let upgradedTo = "";
    const stateWith40 = makeState({
      sla: "Standard",
      criteria: Array.from({ length: 40 }, (_, i) => ({
        id: `C${i + 1}`,
        description: `Criterion ${i + 1}`,
        type: "criterion" as const,
        status: "pending" as const,
        createdInPhase: "OBSERVE" as const,
      })),
    });
    let readCount = 0;
    const deps = makeDeps({
      readState: () => {
        readCount++;
        return readCount === 1 ? makeState() : stateWith40;
      },
      effortLevelUpdate: (_sid, level) => {
        upgradedTo = level;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "TaskCreate",
      tool_input: { subject: "ISC-C40: Fortieth criterion" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(upgradedTo).toBe("Deep");
  });

  test("does not upgrade SLA when already beyond Standard", () => {
    let upgradeCalled = false;
    const stateExtended = makeState({
      sla: "Extended",
      criteria: Array.from({ length: 20 }, (_, i) => ({
        id: `C${i + 1}`,
        description: `Criterion ${i + 1}`,
        type: "criterion" as const,
        status: "pending" as const,
        createdInPhase: "OBSERVE" as const,
      })),
    });
    let readCount = 0;
    const deps = makeDeps({
      readState: () => {
        readCount++;
        return readCount === 1 ? makeState() : stateExtended;
      },
      effortLevelUpdate: () => {
        upgradeCalled = true;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "TaskCreate",
      tool_input: { subject: "ISC-C20: Some criterion" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(upgradeCalled).toBe(false);
  });
});

// ─── execute — TaskUpdate branch ─────────────────────────────────────────────

describe("AlgorithmTracker.execute — TaskUpdate", () => {
  test("maps pending status to pending", () => {
    let updatedStatus = "";
    const deps = makeDeps({
      criteriaUpdate: (_sid, _taskId, status) => {
        updatedStatus = status;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "TaskUpdate",
      tool_input: { taskId: "42", status: "pending" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(updatedStatus).toBe("pending");
  });

  test("maps in_progress status to in_progress", () => {
    let updatedStatus = "";
    const deps = makeDeps({
      criteriaUpdate: (_sid, _taskId, status) => {
        updatedStatus = status;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "TaskUpdate",
      tool_input: { taskId: "42", status: "in_progress" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(updatedStatus).toBe("in_progress");
  });

  test("maps completed status to completed", () => {
    let updatedStatus = "";
    const deps = makeDeps({
      criteriaUpdate: (_sid, _taskId, status) => {
        updatedStatus = status;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "TaskUpdate",
      tool_input: { taskId: "42", status: "completed" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(updatedStatus).toBe("completed");
  });

  test("maps deleted status to failed", () => {
    let updatedStatus = "";
    const deps = makeDeps({
      criteriaUpdate: (_sid, _taskId, status) => {
        updatedStatus = status;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "TaskUpdate",
      tool_input: { taskId: "42", status: "deleted" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(updatedStatus).toBe("failed");
  });

  test("does not call criteriaUpdate for unknown status", () => {
    let updateCalled = false;
    const deps = makeDeps({
      criteriaUpdate: () => {
        updateCalled = true;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "TaskUpdate",
      tool_input: { taskId: "42", status: "unknown_status" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(updateCalled).toBe(false);
  });
});

// ─── execute — Task branch ────────────────────────────────────────────────────

describe("AlgorithmTracker.execute — Task (agent spawn)", () => {
  test("calls agentAdd with agent name and type", () => {
    let addedName = "";
    let addedType = "";
    const deps = makeDeps({
      agentAdd: (_sid, agent) => {
        addedName = agent.name;
        addedType = agent.agentType;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "Task",
      tool_input: {
        name: "research-agent",
        subagent_type: "specialist",
        description: "Research patterns in codebase",
      },
    };
    AlgorithmTracker.execute(input, deps);
    expect(addedName).toBe("research-agent");
    expect(addedType).toBe("specialist");
  });

  test("falls back to description when name is missing", () => {
    let addedName = "";
    const deps = makeDeps({
      agentAdd: (_sid, agent) => {
        addedName = agent.name;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "Task",
      tool_input: {
        description: "Build the feature",
      },
    };
    AlgorithmTracker.execute(input, deps);
    expect(addedName).toBe("Build the feature");
  });

  test("falls back to 'unnamed' when no name or description", () => {
    let addedName = "";
    const deps = makeDeps({
      agentAdd: (_sid, agent) => {
        addedName = agent.name;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "Task",
      tool_input: {},
    };
    AlgorithmTracker.execute(input, deps);
    expect(addedName).toBe("unnamed");
  });

  test("uses prompt field as task when description is absent", () => {
    let addedAgent: { name: string; agentType: string; task?: string } | null = null;
    const deps = makeDeps({
      agentAdd: (_sid, agent) => {
        addedAgent = agent;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "Task",
      tool_input: { name: "worker", prompt: "Fix the bug" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(addedAgent).not.toBeNull();
    expect(addedAgent!.task).toBe("Fix the bug");
  });

  test("defaults agentType to general-purpose when missing", () => {
    let addedType = "";
    const deps = makeDeps({
      agentAdd: (_sid, agent) => {
        addedType = agent.agentType;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "Task",
      tool_input: { name: "worker" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(addedType).toBe("general-purpose");
  });

  test("returns ok({continue: true})", () => {
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "Task",
      tool_input: { name: "agent" },
    };
    const result = AlgorithmTracker.execute(input, makeDeps());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.continue).toBe(true);
  });
});

// ─── execute — edge cases ─────────────────────────────────────────────────────

describe("AlgorithmTracker.execute — edge cases", () => {
  // E08: VERIFY trailing-period variant
  test("detects VERIFY phase with trailing period", () => {
    let transitioned = "";
    const deps = makeDeps({
      readState: () => makeState(),
      phaseTransition: (_sid, phase) => {
        transitioned = phase;
      },
    });
    const input = makeBashInput(makeNotifyCommand("Entering the VERIFY phase."));
    AlgorithmTracker.execute(input, deps);
    expect(transitioned).toBe("VERIFY");
  });

  // E09: Rework via summary-only (no criteria but has summary)
  test("detects rework when state has summary but no criteria", () => {
    let fetchBody = "";
    const summaryState = makeState({
      currentPhase: "COMPLETE",
      criteria: [],
      summary: "Session completed successfully",
      reworkCount: 1,
    });

    const mockFetch = ((_url: RequestInfo | URL, init?: RequestInit) => {
      fetchBody = (init?.body as string) ?? "";
      return Promise.resolve(new Response());
    }) as typeof globalThis.fetch;

    const deps = makeDeps({
      readState: () => summaryState,
      phaseTransition: () => {},
      fetch: mockFetch,
    });

    const input = makeBashInput(makeNotifyCommand("Entering the OBSERVE phase"));
    AlgorithmTracker.execute(input, deps);
    expect(fetchBody).toContain("Rework iteration");
  });

  // E10: TaskUpdate missing taskId or status is a no-op
  test("does not call criteriaUpdate when taskId is missing", () => {
    let updateCalled = false;
    const deps = makeDeps({
      criteriaUpdate: () => {
        updateCalled = true;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "TaskUpdate",
      tool_input: { status: "completed" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(updateCalled).toBe(false);
  });

  test("does not call criteriaUpdate when status is missing", () => {
    let updateCalled = false;
    const deps = makeDeps({
      criteriaUpdate: () => {
        updateCalled = true;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "TaskUpdate",
      tool_input: { taskId: "42" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(updateCalled).toBe(false);
  });

  // E11: Non-matching TaskCreate (no ISC subject, no tool_result) is a no-op
  test("does not call criteriaAdd when TaskCreate has no parseable subject or tool_result", () => {
    let addCalled = false;
    const deps = makeDeps({
      readState: () => makeState(),
      criteriaAdd: () => {
        addCalled = true;
      },
    });
    const input: ToolHookInput = {
      session_id: "test-session",
      tool_name: "TaskCreate",
      tool_input: { subject: "Just a plain description with no ISC ID" },
    };
    AlgorithmTracker.execute(input, deps);
    expect(addCalled).toBe(false);
  });
});
