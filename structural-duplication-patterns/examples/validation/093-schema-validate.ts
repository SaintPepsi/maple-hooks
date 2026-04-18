// Pattern 93: Schema-Validate
// Validate data against a schema definition with detailed error reporting

interface ValidationError {
  path: string;
  message: string;
  expected: string;
  received: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface UserInput {
  username: string;
  email: string;
  age: number;
}

interface ProductInput {
  name: string;
  price: number;
  category: string;
}

interface AddressInput {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

// Variant A
function validateUserInput(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: [{ path: '', message: 'Expected object', expected: 'object', received: typeof data }] };
  }

  const input = data as Record<string, unknown>;

  if (typeof input.username !== 'string') {
    errors.push({ path: 'username', message: 'Must be a string', expected: 'string', received: typeof input.username });
  } else if (input.username.length < 3) {
    errors.push({ path: 'username', message: 'Must be at least 3 characters', expected: 'min 3 chars', received: `${input.username.length} chars` });
  }

  if (typeof input.email !== 'string') {
    errors.push({ path: 'email', message: 'Must be a string', expected: 'string', received: typeof input.email });
  } else if (!input.email.includes('@')) {
    errors.push({ path: 'email', message: 'Must be valid email', expected: 'email format', received: input.email });
  }

  if (typeof input.age !== 'number') {
    errors.push({ path: 'age', message: 'Must be a number', expected: 'number', received: typeof input.age });
  } else if (input.age < 0 || input.age > 150) {
    errors.push({ path: 'age', message: 'Must be between 0 and 150', expected: '0-150', received: String(input.age) });
  }

  return { valid: errors.length === 0, errors };
}

// Variant B
function validateProductInput(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: [{ path: '', message: 'Expected object', expected: 'object', received: typeof data }] };
  }

  const input = data as Record<string, unknown>;

  if (typeof input.name !== 'string') {
    errors.push({ path: 'name', message: 'Must be a string', expected: 'string', received: typeof input.name });
  } else if (input.name.length === 0) {
    errors.push({ path: 'name', message: 'Cannot be empty', expected: 'non-empty', received: 'empty' });
  }

  if (typeof input.price !== 'number') {
    errors.push({ path: 'price', message: 'Must be a number', expected: 'number', received: typeof input.price });
  } else if (input.price < 0) {
    errors.push({ path: 'price', message: 'Cannot be negative', expected: '>= 0', received: String(input.price) });
  }

  if (typeof input.category !== 'string') {
    errors.push({ path: 'category', message: 'Must be a string', expected: 'string', received: typeof input.category });
  }

  return { valid: errors.length === 0, errors };
}

// Variant C
function validateAddressInput(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: [{ path: '', message: 'Expected object', expected: 'object', received: typeof data }] };
  }

  const input = data as Record<string, unknown>;

  if (typeof input.street !== 'string') {
    errors.push({ path: 'street', message: 'Must be a string', expected: 'string', received: typeof input.street });
  }

  if (typeof input.city !== 'string') {
    errors.push({ path: 'city', message: 'Must be a string', expected: 'string', received: typeof input.city });
  }

  if (typeof input.postalCode !== 'string') {
    errors.push({ path: 'postalCode', message: 'Must be a string', expected: 'string', received: typeof input.postalCode });
  } else if (!/^[A-Z0-9\s-]+$/i.test(input.postalCode)) {
    errors.push({ path: 'postalCode', message: 'Invalid format', expected: 'alphanumeric', received: input.postalCode });
  }

  if (typeof input.country !== 'string') {
    errors.push({ path: 'country', message: 'Must be a string', expected: 'string', received: typeof input.country });
  }

  return { valid: errors.length === 0, errors };
}

export { validateUserInput, validateProductInput, validateAddressInput };
export type { ValidationResult, ValidationError, UserInput, ProductInput, AddressInput };
