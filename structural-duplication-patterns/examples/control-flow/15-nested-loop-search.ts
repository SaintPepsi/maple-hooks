// Pattern 15: Nested-Loop-Search
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Outer loop -> inner loop -> condition -> early return

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface User {
  id: string;
  name: string;
}

interface Permission {
  userId: string;
  resource: string;
}

interface Product {
  id: string;
  name: string;
}

interface Order {
  productId: string;
  quantity: number;
}

interface Point {
  x: number;
  y: number;
}

interface Region {
  topLeft: Point;
  bottomRight: Point;
}

function userHasPermission(user: User, permission: Permission): boolean {
  return user.id === permission.userId;
}

function productInOrder(product: Product, order: Order): boolean {
  return product.id === order.productId;
}

function pointInRegion(point: Point, region: Region): boolean {
  return (
    point.x >= region.topLeft.x &&
    point.x <= region.bottomRight.x &&
    point.y >= region.topLeft.y &&
    point.y <= region.bottomRight.y
  );
}

// ============================================================================
// VARIANT A: Find first user-permission match
// ============================================================================

function findUserWithPermission(
  users: User[],
  permissions: Permission[]
): [User, Permission] | null {
  for (const user of users) {
    for (const permission of permissions) {
      if (userHasPermission(user, permission)) {
        return [user, permission];
      }
    }
  }
  return null;
}

// ============================================================================
// VARIANT B: Find first product-order match
// ============================================================================

function findProductInOrders(
  products: Product[],
  orders: Order[]
): [Product, Order] | null {
  for (const product of products) {
    for (const order of orders) {
      if (productInOrder(product, order)) {
        return [product, order];
      }
    }
  }
  return null;
}

// ============================================================================
// VARIANT C: Find first point within any region
// ============================================================================

function findPointInRegions(
  points: Point[],
  regions: Region[]
): [Point, Region] | null {
  for (const point of points) {
    for (const region of regions) {
      if (pointInRegion(point, region)) {
        return [point, region];
      }
    }
  }
  return null;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  findUserWithPermission,
  findProductInOrders,
  findPointInRegions,
  User,
  Permission,
  Product,
  Order,
  Point,
  Region,
};
