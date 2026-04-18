// Pattern 13: Continue-On-Condition
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Skip iteration on condition, continue with rest

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface User {
  id: string;
  name: string;
  deleted: boolean;
}

interface Order {
  id: string;
  total: number;
  cancelled: boolean;
}

interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
}

function isDeletedUser(user: User): boolean {
  return user.deleted;
}

function notifyUser(user: User): void {
  console.log(`Notifying user: ${user.name}`);
}

function isCancelledOrder(order: Order): boolean {
  return order.cancelled;
}

function processOrder(order: Order): void {
  console.log(`Processing order: ${order.id}, total: ${order.total}`);
}

function isDebugLog(entry: LogEntry): boolean {
  return entry.level === "debug";
}

function displayLogEntry(entry: LogEntry): void {
  console.log(`[${entry.level}] ${entry.message}`);
}

// ============================================================================
// VARIANT A: Notify users, skipping deleted ones
// ============================================================================

function notifyActiveUsers(users: User[]): void {
  for (const user of users) {
    if (isDeletedUser(user)) {
      continue;
    }
    notifyUser(user);
  }
}

// ============================================================================
// VARIANT B: Process orders, skipping cancelled ones
// ============================================================================

function processActiveOrders(orders: Order[]): void {
  for (const order of orders) {
    if (isCancelledOrder(order)) {
      continue;
    }
    processOrder(order);
  }
}

// ============================================================================
// VARIANT C: Display logs, skipping debug entries
// ============================================================================

function displayNonDebugLogs(entries: LogEntry[]): void {
  for (const entry of entries) {
    if (isDebugLog(entry)) {
      continue;
    }
    displayLogEntry(entry);
  }
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  notifyActiveUsers,
  processActiveOrders,
  displayNonDebugLogs,
  User,
  Order,
  LogEntry,
};
