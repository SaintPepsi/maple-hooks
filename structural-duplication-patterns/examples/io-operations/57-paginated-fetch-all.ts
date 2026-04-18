// Pattern 57: Paginated-Fetch-All
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Initialize cursor -> loop fetching pages -> collect results -> continue until done

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface User {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  amount: number;
  date: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface PagedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

async function fetchUsersPage(_cursor: string | null): Promise<PagedResponse<User>> {
  return { items: [], nextCursor: null };
}

async function fetchTransactionsPage(_cursor: string | null): Promise<PagedResponse<Transaction>> {
  return { items: [], nextCursor: null };
}

async function fetchLogsPage(_cursor: string | null): Promise<PagedResponse<LogEntry>> {
  return { items: [], nextCursor: null };
}

// ============================================================================
// VARIANT A: Fetch all users with pagination
// ============================================================================

async function fetchAllUsers(): Promise<User[]> {
  const allItems: User[] = [];
  let cursor: string | null = null;
  do {
    const page = await fetchUsersPage(cursor);
    allItems.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor !== null);
  return allItems;
}

// ============================================================================
// VARIANT B: Fetch all transactions with pagination
// ============================================================================

async function fetchAllTransactions(): Promise<Transaction[]> {
  const allItems: Transaction[] = [];
  let cursor: string | null = null;
  do {
    const page = await fetchTransactionsPage(cursor);
    allItems.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor !== null);
  return allItems;
}

// ============================================================================
// VARIANT C: Fetch all logs with pagination
// ============================================================================

async function fetchAllLogs(): Promise<LogEntry[]> {
  const allItems: LogEntry[] = [];
  let cursor: string | null = null;
  do {
    const page = await fetchLogsPage(cursor);
    allItems.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor !== null);
  return allItems;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  fetchAllUsers,
  fetchAllTransactions,
  fetchAllLogs,
  User,
  Transaction,
  LogEntry,
};
