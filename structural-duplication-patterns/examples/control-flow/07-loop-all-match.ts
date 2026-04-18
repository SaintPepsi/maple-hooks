// Pattern 7: Loop-All-Match
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Iterate -> check condition -> return false on mismatch -> return true

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface User {
  id: string;
  verified: boolean;
}

interface Payment {
  id: string;
  processed: boolean;
}

interface Test {
  name: string;
  passed: boolean;
}

function isVerifiedUser(user: User): boolean {
  return user.verified;
}

function isProcessedPayment(payment: Payment): boolean {
  return payment.processed;
}

function isPassingTest(test: Test): boolean {
  return test.passed;
}

// ============================================================================
// VARIANT A: Check if all users are verified
// ============================================================================

function allUsersVerified(users: User[]): boolean {
  for (const user of users) {
    if (!isVerifiedUser(user)) {
      return false;
    }
  }
  return true;
}

// ============================================================================
// VARIANT B: Check if all payments are processed
// ============================================================================

function allPaymentsProcessed(payments: Payment[]): boolean {
  for (const payment of payments) {
    if (!isProcessedPayment(payment)) {
      return false;
    }
  }
  return true;
}

// ============================================================================
// VARIANT C: Check if all tests passed
// ============================================================================

function allTestsPassed(tests: Test[]): boolean {
  for (const test of tests) {
    if (!isPassingTest(test)) {
      return false;
    }
  }
  return true;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  allUsersVerified,
  allPaymentsProcessed,
  allTestsPassed,
  User,
  Payment,
  Test,
};
