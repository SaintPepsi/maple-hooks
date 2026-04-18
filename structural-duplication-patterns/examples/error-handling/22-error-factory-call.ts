// Pattern 22: Error-Factory-Call
// Structure: throw ErrorFactory.specificError(context)
// The pattern uses factory methods to create consistent, typed errors

// Error factory with static methods
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  // Variant A: Authentication errors
  static unauthorized(reason: string): AppError {
    return new AppError(`Unauthorized: ${reason}`, 'AUTH_UNAUTHORIZED', 401, { reason });
  }

  static forbidden(resource: string): AppError {
    return new AppError(`Forbidden: Access denied to ${resource}`, 'AUTH_FORBIDDEN', 403, { resource });
  }

  static tokenExpired(tokenId: string): AppError {
    return new AppError('Token has expired', 'AUTH_TOKEN_EXPIRED', 401, { tokenId });
  }

  // Variant B: Validation errors
  static invalidInput(field: string, reason: string): AppError {
    return new AppError(`Invalid ${field}: ${reason}`, 'VALIDATION_INVALID', 400, { field, reason });
  }

  static missingField(field: string): AppError {
    return new AppError(`Missing required field: ${field}`, 'VALIDATION_MISSING', 400, { field });
  }

  static outOfRange(field: string, min: number, max: number, actual: number): AppError {
    return new AppError(
      `${field} must be between ${min} and ${max}, got ${actual}`,
      'VALIDATION_RANGE',
      400,
      { field, min, max, actual }
    );
  }

  // Variant C: Resource errors
  static notFound(resource: string, id: string): AppError {
    return new AppError(`${resource} not found: ${id}`, 'RESOURCE_NOT_FOUND', 404, { resource, id });
  }

  static alreadyExists(resource: string, identifier: string): AppError {
    return new AppError(
      `${resource} already exists: ${identifier}`,
      'RESOURCE_EXISTS',
      409,
      { resource, identifier }
    );
  }

  static stale(resource: string, version: number): AppError {
    return new AppError(
      `${resource} has been modified (version ${version})`,
      'RESOURCE_STALE',
      409,
      { resource, version }
    );
  }
}

// Usage examples showing the factory pattern
function authenticateUser(token: string | undefined): void {
  if (!token) {
    throw AppError.unauthorized('No token provided');
  }
  if (token === 'expired') {
    throw AppError.tokenExpired(token);
  }
}

function validateAge(age: number): void {
  if (age < 0 || age > 150) {
    throw AppError.outOfRange('age', 0, 150, age);
  }
}

function findUser(id: string, users: Map<string, unknown>): unknown {
  const user = users.get(id);
  if (!user) {
    throw AppError.notFound('User', id);
  }
  return user;
}

export { AppError, authenticateUser, validateAge, findUser };
