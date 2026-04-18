// Pattern 31: Map-Transform
// Shape: Iterate collection -> transform each item -> return new collection

// === Types ===

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
}

interface UserDTO {
  id: string;
  displayName: string;
  email: string;
  memberSince: string;
}

interface Order {
  orderId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  status: 'pending' | 'shipped' | 'delivered';
  orderDate: Date;
}

interface OrderSummary {
  id: string;
  customer: string;
  itemCount: number;
  total: number;
  status: string;
}

interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}

interface FormattedLog {
  time: string;
  severity: string;
  text: string;
}

// === Variant A: User to DTO transformation ===

function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    displayName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    memberSince: user.createdAt.toISOString().split('T')[0],
  };
}

function transformUsers(users: User[]): UserDTO[] {
  return users.map((user) => toUserDTO(user));
}

// === Variant B: Order to summary transformation ===

function toOrderSummary(order: Order): OrderSummary {
  return {
    id: order.orderId,
    customer: order.customerId,
    itemCount: order.items.length,
    total: order.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    status: order.status,
  };
}

function transformOrders(orders: Order[]): OrderSummary[] {
  return orders.map((order) => toOrderSummary(order));
}

// === Variant C: Log entry formatting ===

function formatLogEntry(entry: LogEntry): FormattedLog {
  const severityMap: Record<LogEntry['level'], string> = {
    debug: 'DEBUG',
    info: 'INFO',
    warn: 'WARNING',
    error: 'ERROR',
  };

  return {
    time: new Date(entry.timestamp).toISOString(),
    severity: severityMap[entry.level],
    text: entry.message,
  };
}

function formatLogs(entries: LogEntry[]): FormattedLog[] {
  return entries.map((entry) => formatLogEntry(entry));
}

// === Exports ===

export {
  transformUsers,
  transformOrders,
  formatLogs,
  toUserDTO,
  toOrderSummary,
  formatLogEntry,
};

export type {
  User,
  UserDTO,
  Order,
  OrderSummary,
  LogEntry,
  FormattedLog,
};
