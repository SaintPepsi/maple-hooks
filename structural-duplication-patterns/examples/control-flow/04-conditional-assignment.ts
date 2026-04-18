// Pattern 4: Conditional-Assignment
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Initialize variable -> conditionally reassign -> use variable

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface User {
  role: string;
  tier: string;
}

interface Order {
  total: number;
  membershipLevel: string;
}

interface Request {
  priority: string;
  urgency: number;
}

// ============================================================================
// VARIANT A: Determine user access level
// ============================================================================

function determineAccessLevel(user: User): string {
  let access = "basic";
  if (user.role === "admin") {
    access = "full";
  } else if (user.role === "moderator") {
    access = "elevated";
  }
  return access;
}

// ============================================================================
// VARIANT B: Calculate discount percentage
// ============================================================================

function calculateDiscount(order: Order): number {
  let discount = 0;
  if (order.total > 1000) {
    discount = 20;
  } else if (order.total > 500) {
    discount = 10;
  }
  return discount;
}

// ============================================================================
// VARIANT C: Assign request priority
// ============================================================================

function assignPriority(request: Request): string {
  let priority = "low";
  if (request.urgency > 8) {
    priority = "critical";
  } else if (request.urgency > 5) {
    priority = "high";
  }
  return priority;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  determineAccessLevel,
  calculateDiscount,
  assignPriority,
  User,
  Order,
  Request,
};
