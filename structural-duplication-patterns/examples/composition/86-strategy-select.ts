// Pattern 86: Strategy-Select
// Strategy pattern selecting algorithms at runtime

// Variant A: Pricing Strategy
interface PricingStrategy {
  calculate(basePrice: number, quantity: number): number;
}

const standardPricing: PricingStrategy = {
  calculate(basePrice, quantity) {
    return basePrice * quantity;
  },
};

const bulkPricing: PricingStrategy = {
  calculate(basePrice, quantity) {
    const discount = quantity >= 10 ? 0.1 : 0;
    return basePrice * quantity * (1 - discount);
  },
};

const premiumPricing: PricingStrategy = {
  calculate(basePrice, quantity) {
    return basePrice * quantity * 1.2;
  },
};

function createPricingCalculator(strategy: PricingStrategy) {
  return {
    setStrategy(newStrategy: PricingStrategy) {
      strategy = newStrategy;
    },
    calculate(basePrice: number, quantity: number) {
      return strategy.calculate(basePrice, quantity);
    },
  };
}

// Variant B: Compression Strategy
interface CompressionStrategy {
  compress(data: Buffer): Buffer;
  decompress(data: Buffer): Buffer;
}

const gzipStrategy: CompressionStrategy = {
  compress(data) {
    return Buffer.from(`gzip:${data.toString()}`);
  },
  decompress(data) {
    return Buffer.from(data.toString().replace("gzip:", ""));
  },
};

const zlibStrategy: CompressionStrategy = {
  compress(data) {
    return Buffer.from(`zlib:${data.toString()}`);
  },
  decompress(data) {
    return Buffer.from(data.toString().replace("zlib:", ""));
  },
};

function createCompressor(strategy: CompressionStrategy) {
  return {
    setStrategy(newStrategy: CompressionStrategy) {
      strategy = newStrategy;
    },
    compress(data: Buffer) {
      return strategy.compress(data);
    },
    decompress(data: Buffer) {
      return strategy.decompress(data);
    },
  };
}

// Variant C: Sorting Strategy
interface SortStrategy<T> {
  sort(items: T[]): T[];
}

const quickSort: SortStrategy<number> = {
  sort(items) {
    return [...items].sort((a, b) => a - b);
  },
};

const mergeSort: SortStrategy<number> = {
  sort(items) {
    return [...items].sort((a, b) => a - b);
  },
};

function createSorter<T>(strategy: SortStrategy<T>) {
  return {
    setStrategy(newStrategy: SortStrategy<T>) {
      strategy = newStrategy;
    },
    sort(items: T[]) {
      return strategy.sort(items);
    },
  };
}

export {
  createPricingCalculator,
  createCompressor,
  createSorter,
  standardPricing,
  bulkPricing,
  premiumPricing,
  gzipStrategy,
  zlibStrategy,
  quickSort,
  mergeSort,
};
