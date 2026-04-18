// Pattern 9: Loop-Count
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Initialize counter -> iterate -> increment on condition -> return count

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface User {
  id: string;
  active: boolean;
}

interface Task {
  id: string;
  completed: boolean;
}

interface Error {
  code: number;
  critical: boolean;
}

function isActiveUser(user: User): boolean {
  return user.active;
}

function isCompletedTask(task: Task): boolean {
  return task.completed;
}

function isCriticalError(error: Error): boolean {
  return error.critical;
}

// ============================================================================
// VARIANT A: Count active users
// ============================================================================

function countActiveUsers(users: User[]): number {
  let count = 0;
  for (const user of users) {
    if (isActiveUser(user)) {
      count++;
    }
  }
  return count;
}

// ============================================================================
// VARIANT B: Count completed tasks
// ============================================================================

function countCompletedTasks(tasks: Task[]): number {
  let count = 0;
  for (const task of tasks) {
    if (isCompletedTask(task)) {
      count++;
    }
  }
  return count;
}

// ============================================================================
// VARIANT C: Count critical errors
// ============================================================================

function countCriticalErrors(errors: Error[]): number {
  let count = 0;
  for (const error of errors) {
    if (isCriticalError(error)) {
      count++;
    }
  }
  return count;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  countActiveUsers,
  countCompletedTasks,
  countCriticalErrors,
  User,
  Task,
  Error,
};
