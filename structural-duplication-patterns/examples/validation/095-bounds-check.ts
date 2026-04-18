// Pattern 95: Bounds-Check
// Validate numeric values are within acceptable ranges

interface BoundsResult {
  valid: boolean;
  value: number;
  error?: string;
}

// Variant A
function checkAge(value: number): BoundsResult {
  const min = 0;
  const max = 150;

  if (!Number.isFinite(value)) {
    return { valid: false, value, error: 'Age must be a finite number' };
  }

  if (value < min) {
    return { valid: false, value, error: `Age must be at least ${min}` };
  }

  if (value > max) {
    return { valid: false, value, error: `Age must be at most ${max}` };
  }

  return { valid: true, value };
}

// Variant B
function checkPrice(value: number): BoundsResult {
  const min = 0;
  const max = 1_000_000;

  if (!Number.isFinite(value)) {
    return { valid: false, value, error: 'Price must be a finite number' };
  }

  if (value < min) {
    return { valid: false, value, error: `Price must be at least ${min}` };
  }

  if (value > max) {
    return { valid: false, value, error: `Price must be at most ${max}` };
  }

  return { valid: true, value };
}

// Variant C
function checkQuantity(value: number): BoundsResult {
  const min = 1;
  const max = 10_000;

  if (!Number.isFinite(value)) {
    return { valid: false, value, error: 'Quantity must be a finite number' };
  }

  if (!Number.isInteger(value)) {
    return { valid: false, value, error: 'Quantity must be an integer' };
  }

  if (value < min) {
    return { valid: false, value, error: `Quantity must be at least ${min}` };
  }

  if (value > max) {
    return { valid: false, value, error: `Quantity must be at most ${max}` };
  }

  return { valid: true, value };
}

// Generic bounds checker factory
function createBoundsChecker(
  name: string,
  min: number,
  max: number,
  options: { integer?: boolean } = {}
): (value: number) => BoundsResult {
  return (value: number): BoundsResult => {
    if (!Number.isFinite(value)) {
      return { valid: false, value, error: `${name} must be a finite number` };
    }

    if (options.integer && !Number.isInteger(value)) {
      return { valid: false, value, error: `${name} must be an integer` };
    }

    if (value < min) {
      return { valid: false, value, error: `${name} must be at least ${min}` };
    }

    if (value > max) {
      return { valid: false, value, error: `${name} must be at most ${max}` };
    }

    return { valid: true, value };
  };
}

// Factory usage
const checkPercentage = createBoundsChecker('Percentage', 0, 100);
const checkRating = createBoundsChecker('Rating', 1, 5, { integer: true });
const checkTemperature = createBoundsChecker('Temperature', -273.15, 1_000_000);

export {
  checkAge,
  checkPrice,
  checkQuantity,
  checkPercentage,
  checkRating,
  checkTemperature,
  createBoundsChecker,
};
export type { BoundsResult };
