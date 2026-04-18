// Pattern 98: Length-Validate
// Validate string or array length constraints

interface LengthValidationResult {
  valid: boolean;
  length: number;
  error?: string;
}

// Variant A
function validateUsername(value: string): LengthValidationResult {
  const minLength = 3;
  const maxLength = 32;
  const length = value.length;

  if (length === 0) {
    return { valid: false, length, error: 'Username is required' };
  }

  if (length < minLength) {
    return { valid: false, length, error: `Username must be at least ${minLength} characters` };
  }

  if (length > maxLength) {
    return { valid: false, length, error: `Username must be at most ${maxLength} characters` };
  }

  return { valid: true, length };
}

// Variant B
function validatePassword(value: string): LengthValidationResult {
  const minLength = 8;
  const maxLength = 128;
  const length = value.length;

  if (length === 0) {
    return { valid: false, length, error: 'Password is required' };
  }

  if (length < minLength) {
    return { valid: false, length, error: `Password must be at least ${minLength} characters` };
  }

  if (length > maxLength) {
    return { valid: false, length, error: `Password must be at most ${maxLength} characters` };
  }

  return { valid: true, length };
}

// Variant C
function validateDescription(value: string): LengthValidationResult {
  const minLength = 10;
  const maxLength = 1000;
  const length = value.length;

  if (length === 0) {
    return { valid: false, length, error: 'Description is required' };
  }

  if (length < minLength) {
    return { valid: false, length, error: `Description must be at least ${minLength} characters` };
  }

  if (length > maxLength) {
    return { valid: false, length, error: `Description must be at most ${maxLength} characters` };
  }

  return { valid: true, length };
}

// Array length validators
function validateTags(tags: string[]): LengthValidationResult {
  const minCount = 1;
  const maxCount = 10;
  const length = tags.length;

  if (length < minCount) {
    return { valid: false, length, error: `At least ${minCount} tag is required` };
  }

  if (length > maxCount) {
    return { valid: false, length, error: `Maximum ${maxCount} tags allowed` };
  }

  return { valid: true, length };
}

function validateCartItems<T>(items: T[]): LengthValidationResult {
  const minCount = 1;
  const maxCount = 100;
  const length = items.length;

  if (length < minCount) {
    return { valid: false, length, error: 'Cart cannot be empty' };
  }

  if (length > maxCount) {
    return { valid: false, length, error: `Cart cannot have more than ${maxCount} items` };
  }

  return { valid: true, length };
}

// Generic length validator factory
function createLengthValidator(
  name: string,
  minLength: number,
  maxLength: number
): (value: string | unknown[]) => LengthValidationResult {
  return (value: string | unknown[]): LengthValidationResult => {
    const length = value.length;

    if (length === 0) {
      return { valid: false, length, error: `${name} is required` };
    }

    if (length < minLength) {
      return { valid: false, length, error: `${name} must be at least ${minLength} ${typeof value === 'string' ? 'characters' : 'items'}` };
    }

    if (length > maxLength) {
      return { valid: false, length, error: `${name} must be at most ${maxLength} ${typeof value === 'string' ? 'characters' : 'items'}` };
    }

    return { valid: true, length };
  };
}

// Factory usage
const validateTitle = createLengthValidator('Title', 5, 100);
const validateBio = createLengthValidator('Bio', 0, 500);
const validateRecipients = createLengthValidator('Recipients', 1, 50);

export {
  validateUsername,
  validatePassword,
  validateDescription,
  validateTags,
  validateCartItems,
  validateTitle,
  validateBio,
  validateRecipients,
  createLengthValidator,
};
export type { LengthValidationResult };
