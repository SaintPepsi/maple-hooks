// Pattern 100: Sanitize-Validate
// Sanitize input before validation, combining transformation with validation

interface SanitizeValidationResult<T> {
  valid: boolean;
  original: string;
  sanitized: T;
  error?: string;
}

// Variant A - HTML Sanitization
function sanitizeAndValidateHtml(input: string): SanitizeValidationResult<string> {
  const original = input;

  // Remove script tags and event handlers
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    .replace(/javascript:/gi, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  if (sanitized.length === 0 && original.length > 0) {
    return {
      valid: false,
      original,
      sanitized,
      error: 'Content was entirely removed during sanitization',
    };
  }

  // Check for remaining dangerous patterns
  if (/<script/i.test(sanitized) || /javascript:/i.test(sanitized)) {
    return {
      valid: false,
      original,
      sanitized,
      error: 'Potentially dangerous content detected',
    };
  }

  return { valid: true, original, sanitized };
}

// Variant B - Slug Sanitization
function sanitizeAndValidateSlug(input: string): SanitizeValidationResult<string> {
  const original = input;

  // Convert to lowercase
  let sanitized = input.toLowerCase();

  // Replace spaces and underscores with hyphens
  sanitized = sanitized.replace(/[\s_]+/g, '-');

  // Remove non-alphanumeric characters except hyphens
  sanitized = sanitized.replace(/[^a-z0-9-]/g, '');

  // Remove consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-|-$/g, '');

  if (sanitized.length === 0) {
    return {
      valid: false,
      original,
      sanitized,
      error: 'Slug cannot be empty after sanitization',
    };
  }

  if (sanitized.length < 3) {
    return {
      valid: false,
      original,
      sanitized,
      error: 'Slug must be at least 3 characters',
    };
  }

  if (sanitized.length > 100) {
    return {
      valid: false,
      original,
      sanitized: sanitized.slice(0, 100),
      error: 'Slug exceeds maximum length of 100 characters',
    };
  }

  return { valid: true, original, sanitized };
}

// Variant C - SQL Input Sanitization
function sanitizeAndValidateSqlIdentifier(input: string): SanitizeValidationResult<string> {
  const original = input;

  // Trim whitespace
  let sanitized = input.trim();

  // Remove SQL injection patterns
  sanitized = sanitized
    .replace(/['"`;\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');

  // Only allow alphanumeric and underscore
  sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, '');

  if (sanitized.length === 0) {
    return {
      valid: false,
      original,
      sanitized,
      error: 'Identifier cannot be empty after sanitization',
    };
  }

  // Must start with letter or underscore
  if (!/^[a-zA-Z_]/.test(sanitized)) {
    return {
      valid: false,
      original,
      sanitized,
      error: 'Identifier must start with a letter or underscore',
    };
  }

  // Check against reserved words
  const reservedWords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TABLE'];
  if (reservedWords.includes(sanitized.toUpperCase())) {
    return {
      valid: false,
      original,
      sanitized,
      error: 'Identifier cannot be a SQL reserved word',
    };
  }

  if (sanitized.length > 64) {
    return {
      valid: false,
      original,
      sanitized: sanitized.slice(0, 64),
      error: 'Identifier exceeds maximum length of 64 characters',
    };
  }

  return { valid: true, original, sanitized };
}

// Generic sanitize-validate factory
function createSanitizeValidator<T = string>(
  name: string,
  sanitizer: (input: string) => T,
  validators: Array<(value: T, original: string) => string | null>
): (input: string) => SanitizeValidationResult<T> {
  return (input: string): SanitizeValidationResult<T> => {
    const original = input;
    const sanitized = sanitizer(input);

    for (const validator of validators) {
      const error = validator(sanitized, original);
      if (error) {
        return { valid: false, original, sanitized, error };
      }
    }

    return { valid: true, original, sanitized };
  };
}

// Factory usage
const sanitizeAndValidateUsername = createSanitizeValidator(
  'username',
  (input) => input.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
  [
    (val) => (val.length === 0 ? 'Username is required' : null),
    (val) => (val.length < 3 ? 'Username must be at least 3 characters' : null),
    (val) => (val.length > 32 ? 'Username must be at most 32 characters' : null),
    (val) => (!/^[a-z]/.test(val) ? 'Username must start with a letter' : null),
  ]
);

const sanitizeAndValidatePath = createSanitizeValidator(
  'path',
  (input) =>
    input
      .trim()
      .replace(/\/+/g, '/')
      .replace(/\/$/, '')
      .replace(/^(?!\/)/, '/'),
  [
    (val) => (val === '/' || val.length === 0 ? null : null), // Root is valid
    (val) => (/\.\./.test(val) ? 'Path traversal not allowed' : null),
    (val) => (val.length > 1024 ? 'Path exceeds maximum length' : null),
  ]
);

export {
  sanitizeAndValidateHtml,
  sanitizeAndValidateSlug,
  sanitizeAndValidateSqlIdentifier,
  sanitizeAndValidateUsername,
  sanitizeAndValidatePath,
  createSanitizeValidator,
};
export type { SanitizeValidationResult };
