// Pattern 68: Stack-Push-Pop
// LIFO stack operations with push and pop

// Variant A: Undo stack for editor
interface EditorAction {
  type: "insert" | "delete" | "format";
  position: number;
  content: string;
  timestamp: number;
}

interface UndoStack {
  push(action: EditorAction): void;
  pop(): EditorAction | undefined;
  peek(): EditorAction | undefined;
  size(): number;
  isEmpty(): boolean;
  clear(): void;
}

function createUndoStack(maxSize = 100): UndoStack {
  const stack: EditorAction[] = [];

  return {
    push(action: EditorAction): void {
      if (stack.length >= maxSize) {
        stack.shift(); // Remove oldest to maintain max size
      }
      stack.push(action);
    },
    pop(): EditorAction | undefined {
      return stack.pop();
    },
    peek(): EditorAction | undefined {
      return stack[stack.length - 1];
    },
    size(): number {
      return stack.length;
    },
    isEmpty(): boolean {
      return stack.length === 0;
    },
    clear(): void {
      stack.length = 0;
    },
  };
}

// Variant B: Navigation history stack
interface NavigationEntry {
  path: string;
  params: Record<string, string>;
  scrollPosition: number;
}

class NavigationStack {
  private stack: NavigationEntry[] = [];
  private readonly maxHistory: number;

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  push(entry: NavigationEntry): void {
    if (this.stack.length >= this.maxHistory) {
      this.stack.shift();
    }
    this.stack.push(entry);
  }

  pop(): NavigationEntry | undefined {
    return this.stack.pop();
  }

  peek(): NavigationEntry | undefined {
    return this.stack[this.stack.length - 1];
  }

  canGoBack(): boolean {
    return this.stack.length > 1;
  }

  goBack(): NavigationEntry | undefined {
    if (!this.canGoBack()) return undefined;
    this.stack.pop(); // Remove current
    return this.peek(); // Return previous (now current)
  }

  clear(): void {
    this.stack = [];
  }
}

// Variant C: Context stack for nested operations
interface ExecutionContext {
  name: string;
  variables: Record<string, unknown>;
  parent?: ExecutionContext;
}

class ContextStack {
  private stack: ExecutionContext[] = [];

  push(context: Omit<ExecutionContext, "parent">): void {
    const parent = this.peek();
    this.stack.push({ ...context, parent });
  }

  pop(): ExecutionContext | undefined {
    return this.stack.pop();
  }

  peek(): ExecutionContext | undefined {
    return this.stack[this.stack.length - 1];
  }

  depth(): number {
    return this.stack.length;
  }

  resolve(varName: string): unknown {
    // Walk up the stack looking for variable
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const ctx = this.stack[i];
      if (varName in ctx.variables) {
        return ctx.variables[varName];
      }
    }
    return undefined;
  }

  getFullPath(): string {
    return this.stack.map((ctx) => ctx.name).join(" > ");
  }
}
