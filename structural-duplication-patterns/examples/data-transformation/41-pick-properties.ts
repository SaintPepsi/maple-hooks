// Pattern 41: Pick-Properties
// Shape: Extract subset of properties from object

// === Types ===

interface UserProfile {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  lastLogin: Date;
  preferences: Record<string, unknown>;
}

interface OrderDetails {
  orderId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
  total: number;
  shippingAddress: string;
  billingAddress: string;
  paymentMethod: string;
  status: string;
}

interface EmployeeRecord {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  salary: number;
  ssn: string;
  bankAccount: string;
}

// === Variant A: Pick user public fields ===

interface PublicUserProfile {
  id: string;
  username: string;
}

function pickPublicUserFields(user: UserProfile): PublicUserProfile {
  return {
    id: user.id,
    username: user.username,
  };
}

function pickUserContactInfo(
  user: UserProfile
): { id: string; email: string } {
  return {
    id: user.id,
    email: user.email,
  };
}

// === Variant B: Pick order summary ===

interface OrderSummary {
  orderId: string;
  total: number;
  status: string;
}

function pickOrderSummary(order: OrderDetails): OrderSummary {
  return {
    orderId: order.orderId,
    total: order.total,
    status: order.status,
  };
}

function pickShippingInfo(
  order: OrderDetails
): { orderId: string; shippingAddress: string } {
  return {
    orderId: order.orderId,
    shippingAddress: order.shippingAddress,
  };
}

// === Variant C: Pick employee public info ===

interface EmployeePublicInfo {
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
}

function pickEmployeePublicInfo(employee: EmployeeRecord): EmployeePublicInfo {
  return {
    employeeId: employee.employeeId,
    firstName: employee.firstName,
    lastName: employee.lastName,
    department: employee.department,
  };
}

function pickEmployeeContactInfo(
  employee: EmployeeRecord
): { employeeId: string; email: string } {
  return {
    employeeId: employee.employeeId,
    email: employee.email,
  };
}

// === Generic pick utility using loop ===

function pick<T extends Record<string, unknown>>(
  obj: T,
  keys: string[]
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of keys) {
    if (key in obj) {
      (result as Record<string, unknown>)[key] = obj[key];
    }
  }
  return result;
}

// === Exports ===

export {
  pickPublicUserFields,
  pickUserContactInfo,
  pickOrderSummary,
  pickShippingInfo,
  pickEmployeePublicInfo,
  pickEmployeeContactInfo,
  pick,
};

export type {
  UserProfile,
  PublicUserProfile,
  OrderDetails,
  OrderSummary,
  EmployeeRecord,
  EmployeePublicInfo,
};
