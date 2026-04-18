// Pattern 14: Index-Loop-With-Bounds
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Iterate with index, check bounds, access by index

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface User {
  id: string;
  name: string;
}

interface Product {
  sku: string;
  name: string;
}

interface Frame {
  index: number;
  data: Uint8Array;
}

function processUserAtIndex(user: User, index: number): void {
  console.log(`Processing user ${index}: ${user.name}`);
}

function renderProductAtIndex(product: Product, index: number): void {
  console.log(`Rendering product ${index}: ${product.name}`);
}

function displayFrameAtIndex(frame: Frame, index: number): void {
  console.log(`Displaying frame ${index}`);
}

// ============================================================================
// VARIANT A: Process users by index
// ============================================================================

function processUsersByIndex(users: User[]): void {
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    processUserAtIndex(user, i);
  }
}

// ============================================================================
// VARIANT B: Render products by index
// ============================================================================

function renderProductsByIndex(products: Product[]): void {
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    renderProductAtIndex(product, i);
  }
}

// ============================================================================
// VARIANT C: Display frames by index
// ============================================================================

function displayFramesByIndex(frames: Frame[]): void {
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    displayFrameAtIndex(frame, i);
  }
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  processUsersByIndex,
  renderProductsByIndex,
  displayFramesByIndex,
  User,
  Product,
  Frame,
};
