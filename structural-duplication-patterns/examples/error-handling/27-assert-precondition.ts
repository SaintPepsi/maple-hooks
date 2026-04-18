// Pattern 27: Assert-Precondition
// Structure: assert(condition, message) at function entry
// The pattern validates invariants and throws on violation

class AssertionError extends Error {
  constructor(message: string) {
    super(`Assertion failed: ${message}`);
    this.name = 'AssertionError';
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new AssertionError(message);
  }
}

function assertDefined<T>(value: T | null | undefined, name: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new AssertionError(`${name} must be defined`);
  }
}

function assertPositive(value: number, name: string): void {
  if (value <= 0) {
    throw new AssertionError(`${name} must be positive, got ${value}`);
  }
}

// Variant A: Mathematical operations with preconditions
function divide(numerator: number, denominator: number): number {
  assert(denominator !== 0, 'denominator cannot be zero');
  return numerator / denominator;
}

function sqrt(value: number): number {
  assert(value >= 0, 'cannot take square root of negative number');
  return Math.sqrt(value);
}

function log(value: number): number {
  assert(value > 0, 'logarithm requires positive value');
  return Math.log(value);
}

// Variant B: Collection operations with preconditions
function getFirst<T>(array: T[]): T {
  assert(array.length > 0, 'array must not be empty');
  return array[0];
}

function getAt<T>(array: T[], index: number): T {
  assert(index >= 0, 'index must be non-negative');
  assert(index < array.length, `index ${index} out of bounds for array of length ${array.length}`);
  return array[index];
}

function removeAt<T>(array: T[], index: number): T[] {
  assert(index >= 0 && index < array.length, 'index out of bounds');
  return [...array.slice(0, index), ...array.slice(index + 1)];
}

// Variant C: Domain object operations with preconditions
interface Account {
  id: string;
  balance: number;
  status: 'active' | 'frozen' | 'closed';
}

function withdraw(account: Account, amount: number): Account {
  assertDefined(account, 'account');
  assert(account.status === 'active', 'account must be active');
  assertPositive(amount, 'withdrawal amount');
  assert(account.balance >= amount, 'insufficient funds');

  return { ...account, balance: account.balance - amount };
}

function deposit(account: Account, amount: number): Account {
  assertDefined(account, 'account');
  assert(account.status !== 'closed', 'cannot deposit to closed account');
  assertPositive(amount, 'deposit amount');

  return { ...account, balance: account.balance + amount };
}

function transfer(from: Account, to: Account, amount: number): [Account, Account] {
  assertDefined(from, 'source account');
  assertDefined(to, 'destination account');
  assert(from.id !== to.id, 'cannot transfer to same account');
  assertPositive(amount, 'transfer amount');
  assert(from.status === 'active', 'source account must be active');
  assert(to.status === 'active', 'destination account must be active');
  assert(from.balance >= amount, 'insufficient funds');

  return [
    { ...from, balance: from.balance - amount },
    { ...to, balance: to.balance + amount }
  ];
}

export {
  AssertionError,
  assert,
  assertDefined,
  assertPositive,
  divide,
  sqrt,
  log,
  getFirst,
  getAt,
  removeAt,
  withdraw,
  deposit,
  transfer
};
export type { Account };
