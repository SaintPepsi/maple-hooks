// Pattern 6: Loop-Find-First
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Iterate -> check condition -> return on first match -> return default

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface User {
  id: string;
  name: string;
  isAdmin: boolean;
}

interface Product {
  sku: string;
  name: string;
  inStock: boolean;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

function isActiveUser(user: User): boolean {
  return user.isAdmin;
}

function isAvailableProduct(product: Product): boolean {
  return product.inStock;
}

function isPendingTask(task: Task): boolean {
  return !task.completed;
}

// ============================================================================
// VARIANT A: Find first active user
// ============================================================================

function findActiveUser(users: User[]): User | null {
  for (const user of users) {
    if (isActiveUser(user)) {
      return user;
    }
  }
  return null;
}

// ============================================================================
// VARIANT B: Find first available product
// ============================================================================

function findAvailableProduct(products: Product[]): Product | null {
  for (const product of products) {
    if (isAvailableProduct(product)) {
      return product;
    }
  }
  return null;
}

// ============================================================================
// VARIANT C: Find first pending task
// ============================================================================

function findPendingTask(tasks: Task[]): Task | null {
  for (const task of tasks) {
    if (isPendingTask(task)) {
      return task;
    }
  }
  return null;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  findActiveUser,
  findAvailableProduct,
  findPendingTask,
  User,
  Product,
  Task,
};
