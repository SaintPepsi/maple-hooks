// Pattern 18: Try-Catch-Log-Rethrow
// Shape: Try operation → catch → log → rethrow original

interface Logger {
  error(message: string, error: Error): void;
}

declare const userLogger: Logger;
declare const orderLogger: Logger;
declare const paymentLogger: Logger;

// Variant A
function processUser(userId: string): void {
  try {
    validateAndSaveUser(userId);
  } catch (e) {
    userLogger.error(`User processing failed for ${userId}`, e as Error);
    throw e;
  }
}

// Variant B
function processOrder(orderId: string): void {
  try {
    validateAndSaveOrder(orderId);
  } catch (e) {
    orderLogger.error(`Order processing failed for ${orderId}`, e as Error);
    throw e;
  }
}

// Variant C
function processPayment(paymentId: string): void {
  try {
    validateAndSavePayment(paymentId);
  } catch (e) {
    paymentLogger.error(`Payment processing failed for ${paymentId}`, e as Error);
    throw e;
  }
}

// Placeholder functions
declare function validateAndSaveUser(id: string): void;
declare function validateAndSaveOrder(id: string): void;
declare function validateAndSavePayment(id: string): void;

export { processUser, processOrder, processPayment };
