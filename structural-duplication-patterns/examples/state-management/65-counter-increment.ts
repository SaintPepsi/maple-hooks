// Pattern 65: Counter-Increment
// Atomic counter operations with increment/decrement

// Variant A: Request counter for rate limiting
interface RequestCounter {
  count: number;
  increment(): number;
  decrement(): number;
  reset(): void;
}

function createRequestCounter(initial = 0): RequestCounter {
  let count = initial;

  return {
    get count() {
      return count;
    },
    increment(): number {
      return ++count;
    },
    decrement(): number {
      return count > 0 ? --count : 0;
    },
    reset(): void {
      count = 0;
    },
  };
}

// Variant B: Active connections counter
interface ConnectionCounter {
  active: number;
  total: number;
  connect(): number;
  disconnect(): number;
  getStats(): { active: number; total: number; peak: number };
}

function createConnectionCounter(): ConnectionCounter {
  let active = 0;
  let total = 0;
  let peak = 0;

  return {
    get active() {
      return active;
    },
    get total() {
      return total;
    },
    connect(): number {
      active++;
      total++;
      if (active > peak) peak = active;
      return active;
    },
    disconnect(): number {
      if (active > 0) active--;
      return active;
    },
    getStats() {
      return { active, total, peak };
    },
  };
}

// Variant C: Multi-key counter map
class CounterMap {
  private counters = new Map<string, number>();

  increment(key: string, amount = 1): number {
    const current = this.counters.get(key) ?? 0;
    const newValue = current + amount;
    this.counters.set(key, newValue);
    return newValue;
  }

  decrement(key: string, amount = 1): number {
    const current = this.counters.get(key) ?? 0;
    const newValue = Math.max(0, current - amount);
    this.counters.set(key, newValue);
    return newValue;
  }

  get(key: string): number {
    return this.counters.get(key) ?? 0;
  }

  reset(key: string): void {
    this.counters.delete(key);
  }

  getAll(): Record<string, number> {
    return Object.fromEntries(this.counters);
  }
}
