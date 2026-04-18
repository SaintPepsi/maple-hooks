// Pattern 67: Queue-Enqueue-Dequeue
// FIFO queue operations with enqueue and dequeue

// Variant A: Task queue
interface Task {
  id: string;
  priority: number;
  execute: () => Promise<void>;
}

interface TaskQueue {
  enqueue(task: Task): void;
  dequeue(): Task | undefined;
  peek(): Task | undefined;
  size(): number;
  isEmpty(): boolean;
}

function createTaskQueue(): TaskQueue {
  const queue: Task[] = [];

  return {
    enqueue(task: Task): void {
      queue.push(task);
    },
    dequeue(): Task | undefined {
      return queue.shift();
    },
    peek(): Task | undefined {
      return queue[0];
    },
    size(): number {
      return queue.length;
    },
    isEmpty(): boolean {
      return queue.length === 0;
    },
  };
}

// Variant B: Message queue with max size
interface Message {
  type: string;
  payload: unknown;
  timestamp: number;
}

class BoundedMessageQueue {
  private queue: Message[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  enqueue(message: Message): boolean {
    if (this.queue.length >= this.maxSize) {
      return false; // Queue full
    }
    this.queue.push(message);
    return true;
  }

  dequeue(): Message | undefined {
    return this.queue.shift();
  }

  dequeueMany(count: number): Message[] {
    return this.queue.splice(0, count);
  }

  peek(): Message | undefined {
    return this.queue[0];
  }

  size(): number {
    return this.queue.length;
  }

  isFull(): boolean {
    return this.queue.length >= this.maxSize;
  }

  clear(): void {
    this.queue = [];
  }
}

// Variant C: Priority queue (still FIFO within same priority)
interface PriorityItem<T> {
  item: T;
  priority: number;
}

class PriorityQueue<T> {
  private queues: Map<number, T[]> = new Map();
  private priorities: number[] = [];

  enqueue(item: T, priority = 0): void {
    if (!this.queues.has(priority)) {
      this.queues.set(priority, []);
      this.priorities.push(priority);
      this.priorities.sort((a, b) => b - a); // Higher priority first
    }
    this.queues.get(priority)!.push(item);
  }

  dequeue(): T | undefined {
    for (const priority of this.priorities) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        return queue.shift();
      }
    }
    return undefined;
  }

  peek(): T | undefined {
    for (const priority of this.priorities) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        return queue[0];
      }
    }
    return undefined;
  }

  size(): number {
    let total = 0;
    for (const queue of Array.from(this.queues.values())) {
      total += queue.length;
    }
    return total;
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }
}
