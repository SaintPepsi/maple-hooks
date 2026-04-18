// Pattern 99: Composite-Validate
// Compose multiple validators into a single validation pipeline

interface ValidationError {
  field: string;
  message: string;
}

interface CompositeValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: ValidationError[];
}

// Variant A - User Registration
interface UserRegistration {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

function validateUserRegistration(input: unknown): CompositeValidationResult<UserRegistration> {
  const errors: ValidationError[] = [];

  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: [{ field: 'root', message: 'Input must be an object' }] };
  }

  const data = input as Record<string, unknown>;

  // Validate username
  if (typeof data.username !== 'string' || data.username.length < 3) {
    errors.push({ field: 'username', message: 'Username must be at least 3 characters' });
  } else if (data.username.length > 32) {
    errors.push({ field: 'username', message: 'Username must be at most 32 characters' });
  } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
    errors.push({ field: 'username', message: 'Username can only contain letters, numbers, and underscores' });
  }

  // Validate email
  if (typeof data.email !== 'string' || !data.email.includes('@')) {
    errors.push({ field: 'email', message: 'Valid email is required' });
  }

  // Validate password
  if (typeof data.password !== 'string' || data.password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  } else {
    if (!/[A-Z]/.test(data.password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
    }
    if (!/[0-9]/.test(data.password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one number' });
    }
  }

  // Validate password confirmation
  if (data.password !== data.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: input as UserRegistration,
    errors: [],
  };
}

// Variant B - Order Creation
interface OrderCreation {
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

function validateOrderCreation(input: unknown): CompositeValidationResult<OrderCreation> {
  const errors: ValidationError[] = [];

  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: [{ field: 'root', message: 'Input must be an object' }] };
  }

  const data = input as Record<string, unknown>;

  // Validate customer ID
  if (typeof data.customerId !== 'string' || data.customerId.length === 0) {
    errors.push({ field: 'customerId', message: 'Customer ID is required' });
  }

  // Validate items
  if (!Array.isArray(data.items)) {
    errors.push({ field: 'items', message: 'Items must be an array' });
  } else if (data.items.length === 0) {
    errors.push({ field: 'items', message: 'At least one item is required' });
  } else {
    data.items.forEach((item, index) => {
      if (typeof item !== 'object' || item === null) {
        errors.push({ field: `items[${index}]`, message: 'Item must be an object' });
        return;
      }
      const itemData = item as Record<string, unknown>;
      if (typeof itemData.productId !== 'string' || itemData.productId.length === 0) {
        errors.push({ field: `items[${index}].productId`, message: 'Product ID is required' });
      }
      if (typeof itemData.quantity !== 'number' || itemData.quantity < 1) {
        errors.push({ field: `items[${index}].quantity`, message: 'Quantity must be at least 1' });
      }
    });
  }

  // Validate shipping address
  if (typeof data.shippingAddress !== 'object' || data.shippingAddress === null) {
    errors.push({ field: 'shippingAddress', message: 'Shipping address is required' });
  } else {
    const addr = data.shippingAddress as Record<string, unknown>;
    if (typeof addr.street !== 'string' || addr.street.length === 0) {
      errors.push({ field: 'shippingAddress.street', message: 'Street is required' });
    }
    if (typeof addr.city !== 'string' || addr.city.length === 0) {
      errors.push({ field: 'shippingAddress.city', message: 'City is required' });
    }
    if (typeof addr.postalCode !== 'string' || addr.postalCode.length === 0) {
      errors.push({ field: 'shippingAddress.postalCode', message: 'Postal code is required' });
    }
    if (typeof addr.country !== 'string' || addr.country.length === 0) {
      errors.push({ field: 'shippingAddress.country', message: 'Country is required' });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: input as OrderCreation,
    errors: [],
  };
}

// Variant C - API Request
interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  headers: Record<string, string>;
  body?: unknown;
}

function validateApiRequest(input: unknown): CompositeValidationResult<ApiRequest> {
  const errors: ValidationError[] = [];
  const VALID_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: [{ field: 'root', message: 'Input must be an object' }] };
  }

  const data = input as Record<string, unknown>;

  // Validate method
  if (typeof data.method !== 'string') {
    errors.push({ field: 'method', message: 'HTTP method is required' });
  } else if (!VALID_METHODS.includes(data.method)) {
    errors.push({ field: 'method', message: `Method must be one of: ${VALID_METHODS.join(', ')}` });
  }

  // Validate path
  if (typeof data.path !== 'string') {
    errors.push({ field: 'path', message: 'Path is required' });
  } else if (!data.path.startsWith('/')) {
    errors.push({ field: 'path', message: 'Path must start with /' });
  }

  // Validate headers
  if (typeof data.headers !== 'object' || data.headers === null) {
    errors.push({ field: 'headers', message: 'Headers must be an object' });
  } else {
    const headers = data.headers as Record<string, unknown>;
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value !== 'string') {
        errors.push({ field: `headers.${key}`, message: 'Header value must be a string' });
      }
    }
  }

  // Validate body is present for methods that require it
  if ((data.method === 'POST' || data.method === 'PUT') && data.body === undefined) {
    errors.push({ field: 'body', message: `Body is required for ${data.method} requests` });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: input as ApiRequest,
    errors: [],
  };
}

export { validateUserRegistration, validateOrderCreation, validateApiRequest };
export type { CompositeValidationResult, ValidationError, UserRegistration, OrderCreation, ApiRequest };
