// Pattern 85: Event-Emitter-Pattern
// Event emitter with on/off/emit for decoupled communication

// Variant A: Generic Event Emitter
type EventHandler<T = unknown> = (data: T) => void;

function createEventEmitter<Events extends Record<string, unknown>>() {
  const listeners = new Map<keyof Events, Set<EventHandler>>();

  return {
    on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler as EventHandler);
      return () => this.off(event, handler);
    },
    off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>) {
      listeners.get(event)?.delete(handler as EventHandler);
    },
    emit<K extends keyof Events>(event: K, data: Events[K]) {
      listeners.get(event)?.forEach((handler) => handler(data));
    },
  };
}

// Variant B: Document Change Emitter
interface DocumentEvents {
  change: { path: string; content: string };
  save: { path: string };
  close: { path: string };
}

function createDocumentEmitter() {
  const handlers: Partial<
    Record<keyof DocumentEvents, Set<EventHandler<unknown>>>
  > = {};

  return {
    onChange(handler: EventHandler<DocumentEvents["change"]>) {
      (handlers.change ??= new Set()).add(handler as EventHandler);
    },
    onSave(handler: EventHandler<DocumentEvents["save"]>) {
      (handlers.save ??= new Set()).add(handler as EventHandler);
    },
    onClose(handler: EventHandler<DocumentEvents["close"]>) {
      (handlers.close ??= new Set()).add(handler as EventHandler);
    },
    emitChange(data: DocumentEvents["change"]) {
      handlers.change?.forEach((h) => h(data));
    },
    emitSave(data: DocumentEvents["save"]) {
      handlers.save?.forEach((h) => h(data));
    },
    emitClose(data: DocumentEvents["close"]) {
      handlers.close?.forEach((h) => h(data));
    },
  };
}

// Variant C: Task Queue Emitter
interface TaskEvents {
  enqueue: { taskId: string; priority: number };
  complete: { taskId: string; result: unknown };
  error: { taskId: string; error: Error };
}

function createTaskQueueEmitter() {
  const subscriptions = new Map<keyof TaskEvents, EventHandler[]>();

  return {
    subscribe<K extends keyof TaskEvents>(
      event: K,
      handler: EventHandler<TaskEvents[K]>
    ) {
      const handlers = subscriptions.get(event) ?? [];
      handlers.push(handler as EventHandler);
      subscriptions.set(event, handlers);
      return { unsubscribe: () => this.unsubscribe(event, handler) };
    },
    unsubscribe<K extends keyof TaskEvents>(
      event: K,
      handler: EventHandler<TaskEvents[K]>
    ) {
      const handlers = subscriptions.get(event) ?? [];
      const index = handlers.indexOf(handler as EventHandler);
      if (index >= 0) handlers.splice(index, 1);
    },
    publish<K extends keyof TaskEvents>(event: K, data: TaskEvents[K]) {
      subscriptions.get(event)?.forEach((h) => h(data));
    },
  };
}

export { createEventEmitter, createDocumentEmitter, createTaskQueueEmitter };
