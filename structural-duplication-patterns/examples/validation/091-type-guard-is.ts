// Pattern 91: Type-Guard-Is
// User-defined type guard with `is` predicate for runtime type checking

interface User {
  id: string;
  name: string;
  email: string;
}

interface Config {
  host: string;
  port: number;
  secure: boolean;
}

interface Order {
  orderId: string;
  items: OrderItem[];
  total: number;
}

interface OrderItem {
  sku: string;
  quantity: number;
}

// Variant A
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'email' in value &&
    typeof (value as User).id === 'string' &&
    typeof (value as User).name === 'string' &&
    typeof (value as User).email === 'string'
  );
}

// Variant B
function isConfig(value: unknown): value is Config {
  return (
    typeof value === 'object' &&
    value !== null &&
    'host' in value &&
    'port' in value &&
    'secure' in value &&
    typeof (value as Config).host === 'string' &&
    typeof (value as Config).port === 'number' &&
    typeof (value as Config).secure === 'boolean'
  );
}

// Variant C
function isOrder(value: unknown): value is Order {
  return (
    typeof value === 'object' &&
    value !== null &&
    'orderId' in value &&
    'items' in value &&
    'total' in value &&
    typeof (value as Order).orderId === 'string' &&
    Array.isArray((value as Order).items) &&
    typeof (value as Order).total === 'number'
  );
}

// Usage examples
function processData(data: unknown): void {
  if (isUser(data)) {
    console.log(`User: ${data.name} <${data.email}>`);
  } else if (isConfig(data)) {
    console.log(`Config: ${data.host}:${data.port}`);
  } else if (isOrder(data)) {
    console.log(`Order: ${data.orderId} with ${data.items.length} items`);
  }
}

export { isUser, isConfig, isOrder };
