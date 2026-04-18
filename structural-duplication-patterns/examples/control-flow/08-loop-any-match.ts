// Pattern 8: Loop-Any-Match
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Iterate -> check condition -> return true on match -> return false

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface User {
  id: string;
  role: string;
}

interface Order {
  id: string;
  status: string;
}

interface File {
  name: string;
  extension: string;
}

function isAdminUser(user: User): boolean {
  return user.role === "admin";
}

function isPendingOrder(order: Order): boolean {
  return order.status === "pending";
}

function isImageFile(file: File): boolean {
  return ["jpg", "png", "gif"].includes(file.extension);
}

// ============================================================================
// VARIANT A: Check if any user is admin
// ============================================================================

function hasAdminUser(users: User[]): boolean {
  for (const user of users) {
    if (isAdminUser(user)) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// VARIANT B: Check if any order is pending
// ============================================================================

function hasPendingOrder(orders: Order[]): boolean {
  for (const order of orders) {
    if (isPendingOrder(order)) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// VARIANT C: Check if any file is an image
// ============================================================================

function hasImageFile(files: File[]): boolean {
  for (const file of files) {
    if (isImageFile(file)) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  hasAdminUser,
  hasPendingOrder,
  hasImageFile,
  User,
  Order,
  File,
};
