// Pattern 26: Validation-Or-Throw
// Structure: if (!isValid(value)) throw new ValidationError(...)
// The pattern validates input and throws immediately on failure

class ValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly reason: string,
    public readonly value?: unknown
  ) {
    super(`Validation failed for ${field}: ${reason}`);
    this.name = 'ValidationError';
  }
}

// Variant A: Primitive value validation
function validateEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new ValidationError('email', 'must be a string', email);
  }
  if (!email.includes('@')) {
    throw new ValidationError('email', 'must contain @', email);
  }
  if (email.length > 254) {
    throw new ValidationError('email', 'must be 254 characters or less', email);
  }
  return email.toLowerCase().trim();
}

function validateAge(age: unknown): number {
  if (typeof age !== 'number') {
    throw new ValidationError('age', 'must be a number', age);
  }
  if (!Number.isInteger(age)) {
    throw new ValidationError('age', 'must be an integer', age);
  }
  if (age < 0 || age > 150) {
    throw new ValidationError('age', 'must be between 0 and 150', age);
  }
  return age;
}

function validateUsername(username: string): string {
  if (!username || typeof username !== 'string') {
    throw new ValidationError('username', 'must be a non-empty string', username);
  }
  if (username.length < 3) {
    throw new ValidationError('username', 'must be at least 3 characters', username);
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new ValidationError('username', 'must contain only letters, numbers, and underscores', username);
  }
  return username;
}

// Variant B: Object structure validation
interface CreateUserInput {
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

function validateCreateUserInput(input: unknown): CreateUserInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('input', 'must be an object', input);
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj.name !== 'string' || obj.name.length === 0) {
    throw new ValidationError('name', 'must be a non-empty string', obj.name);
  }
  if (typeof obj.email !== 'string' || !obj.email.includes('@')) {
    throw new ValidationError('email', 'must be a valid email', obj.email);
  }
  if (!['admin', 'user', 'guest'].includes(obj.role as string)) {
    throw new ValidationError('role', 'must be admin, user, or guest', obj.role);
  }

  return obj as unknown as CreateUserInput;
}

// Variant C: Array and collection validation
function validateIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) {
    throw new ValidationError('ids', 'must be an array', ids);
  }
  if (ids.length === 0) {
    throw new ValidationError('ids', 'must not be empty', ids);
  }
  if (!ids.every(id => typeof id === 'string')) {
    throw new ValidationError('ids', 'all elements must be strings', ids);
  }
  return ids;
}

function validateTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    throw new ValidationError('tags', 'must be an array', tags);
  }
  if (tags.length > 10) {
    throw new ValidationError('tags', 'must have 10 or fewer items', tags);
  }
  if (!tags.every(tag => typeof tag === 'string' && tag.length <= 50)) {
    throw new ValidationError('tags', 'all tags must be strings of 50 chars or less', tags);
  }
  return tags;
}

function validatePriceRange(min: unknown, max: unknown): [number, number] {
  if (typeof min !== 'number' || typeof max !== 'number') {
    throw new ValidationError('priceRange', 'min and max must be numbers', { min, max });
  }
  if (min < 0 || max < 0) {
    throw new ValidationError('priceRange', 'values must be non-negative', { min, max });
  }
  if (min > max) {
    throw new ValidationError('priceRange', 'min must be less than or equal to max', { min, max });
  }
  return [min, max];
}

export {
  ValidationError,
  validateEmail,
  validateAge,
  validateUsername,
  validateCreateUserInput,
  validateIds,
  validateTags,
  validatePriceRange
};
export type { CreateUserInput };
