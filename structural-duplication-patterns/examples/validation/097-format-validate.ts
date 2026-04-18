// Pattern 97: Format-Validate
// Validate string values match expected format patterns

interface FormatValidationResult {
  valid: boolean;
  value: string;
  error?: string;
}

// Variant A
function validateEmail(value: string): FormatValidationResult {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { valid: false, value: trimmed, error: 'Email is required' };
  }

  // Basic email pattern - covers most common cases
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(trimmed)) {
    return { valid: false, value: trimmed, error: 'Invalid email format' };
  }

  if (trimmed.length > 254) {
    return { valid: false, value: trimmed, error: 'Email exceeds maximum length of 254 characters' };
  }

  return { valid: true, value: trimmed.toLowerCase() };
}

// Variant B
function validatePhoneNumber(value: string): FormatValidationResult {
  // Remove all non-digit characters for validation
  const digits = value.replace(/\D/g, '');

  if (digits.length === 0) {
    return { valid: false, value, error: 'Phone number is required' };
  }

  if (digits.length < 10) {
    return { valid: false, value, error: 'Phone number must have at least 10 digits' };
  }

  if (digits.length > 15) {
    return { valid: false, value, error: 'Phone number exceeds maximum of 15 digits' };
  }

  // Format as international if 11+ digits, otherwise national
  const formatted =
    digits.length >= 11
      ? `+${digits.slice(0, digits.length - 10)} ${digits.slice(-10, -7)}-${digits.slice(-7, -4)}-${digits.slice(-4)}`
      : `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;

  return { valid: true, value: formatted };
}

// Variant C
function validateUUID(value: string): FormatValidationResult {
  const trimmed = value.trim().toLowerCase();

  if (trimmed.length === 0) {
    return { valid: false, value: trimmed, error: 'UUID is required' };
  }

  // Generic UUID pattern (any version)
  const genericUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  if (!genericUuidPattern.test(trimmed)) {
    return { valid: false, value: trimmed, error: 'Invalid UUID format' };
  }

  return { valid: true, value: trimmed };
}

// Additional format validators
function validateUrl(value: string): FormatValidationResult {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { valid: false, value: trimmed, error: 'URL is required' };
  }

  // URL pattern validation without try-catch
  const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

  if (!urlPattern.test(trimmed)) {
    return { valid: false, value: trimmed, error: 'Invalid URL format' };
  }

  // Extract protocol for validation
  const protocolMatch = trimmed.match(/^(https?):\/\//i);
  if (!protocolMatch) {
    return { valid: false, value: trimmed, error: 'URL must use http or https protocol' };
  }

  // Normalize the URL
  const normalized = trimmed.replace(/\/+$/, ''); // Remove trailing slashes

  return { valid: true, value: normalized };
}

function validateSlug(value: string): FormatValidationResult {
  const trimmed = value.trim().toLowerCase();

  if (trimmed.length === 0) {
    return { valid: false, value: trimmed, error: 'Slug is required' };
  }

  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  if (!slugPattern.test(trimmed)) {
    return {
      valid: false,
      value: trimmed,
      error: 'Slug must contain only lowercase letters, numbers, and hyphens',
    };
  }

  if (trimmed.length > 100) {
    return { valid: false, value: trimmed, error: 'Slug exceeds maximum length of 100 characters' };
  }

  return { valid: true, value: trimmed };
}

export { validateEmail, validatePhoneNumber, validateUUID, validateUrl, validateSlug };
export type { FormatValidationResult };
