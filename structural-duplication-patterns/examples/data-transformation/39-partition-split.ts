// Pattern 39: Partition-Split
// Shape: Split collection into two based on predicate

// === Types ===

interface Email {
  id: string;
  subject: string;
  isRead: boolean;
  isSpam: boolean;
  from: string;
}

interface Order {
  id: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
  total: number;
  customerId: string;
}

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
}

// === Variant A: Partition emails by read status ===

function partitionEmailsByReadStatus(
  emails: Email[]
): [Email[], Email[]] {
  const read: Email[] = [];
  const unread: Email[] = [];
  for (const email of emails) {
    if (email.isRead) {
      read.push(email);
    } else {
      unread.push(email);
    }
  }
  return [read, unread];
}

function partitionEmailsBySpam(emails: Email[]): [Email[], Email[]] {
  const spam: Email[] = [];
  const notSpam: Email[] = [];
  for (const email of emails) {
    if (email.isSpam) {
      spam.push(email);
    } else {
      notSpam.push(email);
    }
  }
  return [spam, notSpam];
}

// === Variant B: Partition orders by status ===

function partitionOrdersByFulfillment(
  orders: Order[]
): [Order[], Order[]] {
  const fulfilled: Order[] = [];
  const pending: Order[] = [];
  for (const order of orders) {
    if (order.status === 'fulfilled') {
      fulfilled.push(order);
    } else {
      pending.push(order);
    }
  }
  return [fulfilled, pending];
}

function partitionOrdersByAmount(
  orders: Order[],
  threshold: number
): [Order[], Order[]] {
  const above: Order[] = [];
  const below: Order[] = [];
  for (const order of orders) {
    if (order.total >= threshold) {
      above.push(order);
    } else {
      below.push(order);
    }
  }
  return [above, below];
}

// === Variant C: Partition test results ===

function partitionTestResults(
  results: TestResult[]
): [TestResult[], TestResult[]] {
  const passed: TestResult[] = [];
  const failed: TestResult[] = [];
  for (const result of results) {
    if (result.passed) {
      passed.push(result);
    } else {
      failed.push(result);
    }
  }
  return [passed, failed];
}

function partitionTestsByDuration(
  results: TestResult[],
  maxDuration: number
): [TestResult[], TestResult[]] {
  const fast: TestResult[] = [];
  const slow: TestResult[] = [];
  for (const result of results) {
    if (result.duration <= maxDuration) {
      fast.push(result);
    } else {
      slow.push(result);
    }
  }
  return [fast, slow];
}

// === Generic partition utility ===

function partition<T>(
  items: T[],
  predicate: (item: T) => boolean
): [T[], T[]] {
  const pass: T[] = [];
  const fail: T[] = [];
  for (const item of items) {
    if (predicate(item)) {
      pass.push(item);
    } else {
      fail.push(item);
    }
  }
  return [pass, fail];
}

// === Exports ===

export {
  partitionEmailsByReadStatus,
  partitionEmailsBySpam,
  partitionOrdersByFulfillment,
  partitionOrdersByAmount,
  partitionTestResults,
  partitionTestsByDuration,
  partition,
};

export type { Email, Order, TestResult };
