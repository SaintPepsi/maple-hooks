// Pattern 70: History-Undo-Redo
// Bidirectional history with undo and redo support

// Variant A: Command-based undo/redo
interface Command {
  execute(): void;
  undo(): void;
  description: string;
}

interface CommandHistory {
  execute(command: Command): void;
  undo(): Command | undefined;
  redo(): Command | undefined;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}

function createCommandHistory(maxHistory = 100): CommandHistory {
  const undoStack: Command[] = [];
  const redoStack: Command[] = [];

  return {
    execute(command: Command): void {
      command.execute();
      undoStack.push(command);
      redoStack.length = 0; // Clear redo on new action

      if (undoStack.length > maxHistory) {
        undoStack.shift();
      }
    },
    undo(): Command | undefined {
      const command = undoStack.pop();
      if (command) {
        command.undo();
        redoStack.push(command);
      }
      return command;
    },
    redo(): Command | undefined {
      const command = redoStack.pop();
      if (command) {
        command.execute();
        undoStack.push(command);
      }
      return command;
    },
    canUndo(): boolean {
      return undoStack.length > 0;
    },
    canRedo(): boolean {
      return redoStack.length > 0;
    },
    clear(): void {
      undoStack.length = 0;
      redoStack.length = 0;
    },
  };
}

// Variant B: State snapshot undo/redo
interface StateSnapshot<T> {
  state: T;
  timestamp: number;
  label?: string;
}

class StateHistory<T> {
  private past: StateSnapshot<T>[] = [];
  private future: StateSnapshot<T>[] = [];
  private current: StateSnapshot<T>;
  private readonly maxSnapshots: number;

  constructor(initialState: T, maxSnapshots = 50) {
    this.current = { state: initialState, timestamp: Date.now() };
    this.maxSnapshots = maxSnapshots;
  }

  push(state: T, label?: string): void {
    this.past.push(this.current);
    this.current = { state, timestamp: Date.now(), label };
    this.future = []; // Clear future on new state

    if (this.past.length > this.maxSnapshots) {
      this.past.shift();
    }
  }

  undo(): T | undefined {
    const previous = this.past.pop();
    if (!previous) return undefined;

    this.future.unshift(this.current);
    this.current = previous;
    return this.current.state;
  }

  redo(): T | undefined {
    const next = this.future.shift();
    if (!next) return undefined;

    this.past.push(this.current);
    this.current = next;
    return this.current.state;
  }

  getCurrentState(): T {
    return this.current.state;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  getHistory(): StateSnapshot<T>[] {
    return [...this.past, this.current];
  }
}

// Variant C: Diff-based undo/redo for large objects
interface Diff<T> {
  forward: Partial<T>;
  backward: Partial<T>;
  path?: string;
}

class DiffHistory<T extends Record<string, unknown>> {
  private state: T;
  private undoStack: Diff<T>[] = [];
  private redoStack: Diff<T>[] = [];

  constructor(initialState: T) {
    this.state = { ...initialState };
  }

  applyChange(changes: Partial<T>): void {
    // Calculate backward diff
    const backward: Partial<T> = {};
    for (const key of Object.keys(changes) as (keyof T)[]) {
      backward[key] = this.state[key] as T[keyof T];
    }

    // Apply changes
    this.state = { ...this.state, ...changes };

    // Store diff
    this.undoStack.push({ forward: changes, backward });
    this.redoStack = [];
  }

  undo(): T | undefined {
    const diff = this.undoStack.pop();
    if (!diff) return undefined;

    this.state = { ...this.state, ...diff.backward };
    this.redoStack.push(diff);
    return this.state;
  }

  redo(): T | undefined {
    const diff = this.redoStack.pop();
    if (!diff) return undefined;

    this.state = { ...this.state, ...diff.forward };
    this.undoStack.push(diff);
    return this.state;
  }

  getState(): T {
    return { ...this.state };
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
