// Pattern 96: Enum-Validate
// Validate that a value is a member of an enumeration or literal union

// Define enums and literal unions
enum UserRole {
  Admin = 'admin',
  Editor = 'editor',
  Viewer = 'viewer',
}

enum OrderStatus {
  Pending = 'pending',
  Processing = 'processing',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
}

const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

// Variant A
function isValidUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

function validateUserRole(value: unknown): { valid: boolean; role?: UserRole; error?: string } {
  if (typeof value !== 'string') {
    return { valid: false, error: `Expected string, got ${typeof value}` };
  }

  if (!isValidUserRole(value)) {
    const validRoles = Object.values(UserRole).join(', ');
    return { valid: false, error: `Invalid role '${value}'. Must be one of: ${validRoles}` };
  }

  return { valid: true, role: value };
}

// Variant B
function isValidOrderStatus(value: string): value is OrderStatus {
  return Object.values(OrderStatus).includes(value as OrderStatus);
}

function validateOrderStatus(value: unknown): { valid: boolean; status?: OrderStatus; error?: string } {
  if (typeof value !== 'string') {
    return { valid: false, error: `Expected string, got ${typeof value}` };
  }

  if (!isValidOrderStatus(value)) {
    const validStatuses = Object.values(OrderStatus).join(', ');
    return { valid: false, error: `Invalid status '${value}'. Must be one of: ${validStatuses}` };
  }

  return { valid: true, status: value };
}

// Variant C
function isValidLogLevel(value: string): value is LogLevel {
  return LOG_LEVELS.includes(value as LogLevel);
}

function validateLogLevel(value: unknown): { valid: boolean; level?: LogLevel; error?: string } {
  if (typeof value !== 'string') {
    return { valid: false, error: `Expected string, got ${typeof value}` };
  }

  if (!isValidLogLevel(value)) {
    const validLevels = LOG_LEVELS.join(', ');
    return { valid: false, error: `Invalid log level '${value}'. Must be one of: ${validLevels}` };
  }

  return { valid: true, level: value };
}

// Generic enum validator factory
function createEnumValidator<T extends string>(
  name: string,
  validValues: readonly T[]
): (value: unknown) => { valid: boolean; value?: T; error?: string } {
  return (value: unknown) => {
    if (typeof value !== 'string') {
      return { valid: false, error: `${name} must be a string, got ${typeof value}` };
    }

    if (!validValues.includes(value as T)) {
      return {
        valid: false,
        error: `Invalid ${name} '${value}'. Must be one of: ${validValues.join(', ')}`,
      };
    }

    return { valid: true, value: value as T };
  };
}

// Factory usage
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const validateHttpMethod = createEnumValidator('HTTP method', HTTP_METHODS);

const ENVIRONMENTS = ['development', 'staging', 'production'] as const;
const validateEnvironment = createEnumValidator('environment', ENVIRONMENTS);

export {
  UserRole,
  OrderStatus,
  LOG_LEVELS,
  isValidUserRole,
  isValidOrderStatus,
  isValidLogLevel,
  validateUserRole,
  validateOrderStatus,
  validateLogLevel,
  validateHttpMethod,
  validateEnvironment,
  createEnumValidator,
};
export type { LogLevel };
