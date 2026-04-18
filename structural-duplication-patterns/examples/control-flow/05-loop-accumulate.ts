// Pattern 5: Loop-Accumulate
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Initialize accumulator -> iterate -> update accumulator -> return

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface User {
  id: string;
  name: string;
  email: string;
}

interface Product {
  sku: string;
  name: string;
  price: number;
}

interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
}

function transformUser(user: User): string {
  return user.name.toUpperCase();
}

function transformProduct(product: Product): string {
  return `${product.name}: $${product.price}`;
}

function transformLogEntry(entry: LogEntry): string {
  return `[${entry.level}] ${entry.message}`;
}

// ============================================================================
// VARIANT A: Collect transformed user names
// ============================================================================

function collectUserNames(users: User[]): string[] {
  const result: string[] = [];
  for (const user of users) {
    result.push(transformUser(user));
  }
  return result;
}

// ============================================================================
// VARIANT B: Collect formatted product labels
// ============================================================================

function collectProductLabels(products: Product[]): string[] {
  const result: string[] = [];
  for (const product of products) {
    result.push(transformProduct(product));
  }
  return result;
}

// ============================================================================
// VARIANT C: Collect formatted log messages
// ============================================================================

function collectLogMessages(entries: LogEntry[]): string[] {
  const result: string[] = [];
  for (const entry of entries) {
    result.push(transformLogEntry(entry));
  }
  return result;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  collectUserNames,
  collectProductLabels,
  collectLogMessages,
  User,
  Product,
  LogEntry,
};
