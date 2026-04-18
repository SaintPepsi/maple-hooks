// Pattern 20: Result-Map-Chain
// Structure: result.map(fn1).map(fn2).map(fn3)
// The pattern chains transformations on Result, short-circuiting on first error

type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

interface ResultOps<T, E> {
  map<U>(fn: (value: T) => U): ResultOps<U, E>;
  flatMap<U>(fn: (value: T) => Result<U, E>): ResultOps<U, E>;
  unwrap(): Result<T, E>;
}

function resultOps<T, E>(result: Result<T, E>): ResultOps<T, E> {
  return {
    map<U>(fn: (value: T) => U): ResultOps<U, E> {
      if (!result.ok) return resultOps(result as Result<never, E>);
      return resultOps({ ok: true, value: fn(result.value) });
    },
    flatMap<U>(fn: (value: T) => Result<U, E>): ResultOps<U, E> {
      if (!result.ok) return resultOps(result as Result<never, E>);
      return resultOps(fn(result.value));
    },
    unwrap(): Result<T, E> {
      return result;
    }
  };
}

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Variant A: String transformation chain
function processUsername(input: string): Result<string, string> {
  return resultOps(ok(input))
    .map(s => s.trim())
    .map(s => s.toLowerCase())
    .map(s => s.replace(/\s+/g, '_'))
    .unwrap();
}

// Variant B: Number calculation chain
function calculateTax(price: number): Result<number, string> {
  return resultOps(ok(price))
    .map(p => p * 1.08)
    .map(p => Math.round(p * 100) / 100)
    .map(p => Math.max(0, p))
    .unwrap();
}

// Variant C: Object transformation chain
interface RawProduct { name: string; price: string; quantity: string }
interface Product { name: string; price: number; quantity: number; total: number }

function parseProduct(raw: RawProduct): Result<Product, string> {
  const price = parseFloat(raw.price);
  const quantity = parseInt(raw.quantity, 10);

  if (isNaN(price)) return err('Invalid price');
  if (isNaN(quantity)) return err('Invalid quantity');

  return resultOps(ok({ name: raw.name, price, quantity, total: 0 }))
    .map(p => ({ ...p, name: p.name.trim() }))
    .map(p => ({ ...p, price: Math.abs(p.price) }))
    .map(p => ({ ...p, total: p.price * p.quantity }))
    .unwrap();
}

export { processUsername, calculateTax, parseProduct, resultOps, ok, err };
export type { Result, RawProduct, Product };
