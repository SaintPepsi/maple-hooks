// Pattern 19: Result-Ok-Check-Propagate
// Structure: if (!result.ok) return result; use(result.value)
// The pattern checks Result type and early-returns on failure

type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

type Err<E> = { ok: false; error: E };

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

// Variant A: User validation pipeline
interface User { id: string; email: string; age: number }

function validateEmail(email: string): Result<string, string> {
  if (!email.includes('@')) return err('Invalid email format');
  return ok(email);
}

function validateAge(age: number): Result<number, string> {
  if (age < 0 || age > 150) return err('Invalid age');
  return ok(age);
}

function createUser(email: string, age: number): Result<User, string> {
  const emailResult = validateEmail(email);
  if (isErr(emailResult)) return emailResult;

  const ageResult = validateAge(age);
  if (isErr(ageResult)) return ageResult;

  return ok({ id: crypto.randomUUID(), email: emailResult.value, age: ageResult.value });
}

// Variant B: File parsing pipeline
interface ParsedDocument { title: string; content: string }

function readFile(path: string): Result<string, string> {
  if (!path.endsWith('.md')) return err('Only markdown files supported');
  return ok('# Title\nContent here');
}

function parseMarkdown(text: string): Result<ParsedDocument, string> {
  const lines = text.split('\n');
  if (!lines[0]?.startsWith('#')) return err('Missing title');
  return ok({ title: lines[0].slice(2), content: lines.slice(1).join('\n') });
}

function loadDocument(path: string): Result<ParsedDocument, string> {
  const fileResult = readFile(path);
  if (isErr(fileResult)) return fileResult;

  const parseResult = parseMarkdown(fileResult.value);
  if (isErr(parseResult)) return parseResult;

  return ok(parseResult.value);
}

// Variant C: Order processing pipeline
interface Order { items: string[]; total: number; discount: number }

function validateItems(items: string[]): Result<string[], string> {
  if (items.length === 0) return err('Order must have at least one item');
  return ok(items);
}

function calculateDiscount(total: number): Result<number, string> {
  if (total < 0) return err('Total cannot be negative');
  return ok(total > 100 ? total * 0.1 : 0);
}

function processOrder(items: string[], total: number): Result<Order, string> {
  const itemsResult = validateItems(items);
  if (isErr(itemsResult)) return itemsResult;

  const discountResult = calculateDiscount(total);
  if (isErr(discountResult)) return discountResult;

  return ok({ items: itemsResult.value, total, discount: discountResult.value });
}

export { createUser, loadDocument, processOrder, ok, err };
export type { Result, User, ParsedDocument, Order };
