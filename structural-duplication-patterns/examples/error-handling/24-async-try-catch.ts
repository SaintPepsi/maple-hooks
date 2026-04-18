// Pattern 24: Async-Try-Catch
// Shape: Await async operation → catch → handle error

interface Result<T> {
  ok: boolean;
  value?: T;
  error?: Error;
}

function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

function err<T>(error: Error): Result<T> {
  return { ok: false, error };
}

// Variant A
async function fetchUserData(userId: string): Promise<Result<unknown>> {
  try {
    const response = await fetchUser(userId);
    return ok(response);
  } catch (e) {
    return err(new Error(`Failed to fetch user: ${userId}`));
  }
}

// Variant B
async function fetchOrderData(orderId: string): Promise<Result<unknown>> {
  try {
    const response = await fetchOrder(orderId);
    return ok(response);
  } catch (e) {
    return err(new Error(`Failed to fetch order: ${orderId}`));
  }
}

// Variant C
async function fetchProductData(productId: string): Promise<Result<unknown>> {
  try {
    const response = await fetchProduct(productId);
    return ok(response);
  } catch (e) {
    return err(new Error(`Failed to fetch product: ${productId}`));
  }
}

// Placeholder functions
declare function fetchUser(id: string): Promise<unknown>;
declare function fetchOrder(id: string): Promise<unknown>;
declare function fetchProduct(id: string): Promise<unknown>;

export { fetchUserData, fetchOrderData, fetchProductData };
