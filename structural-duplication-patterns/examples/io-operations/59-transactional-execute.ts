// Pattern 59: Transactional-Execute
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Begin transaction -> execute operations -> commit on success / rollback on failure
// NOTE: Using Result pattern instead of try-catch per project standards

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface Result<T, E> {
  ok: boolean;
  value?: T;
  error?: E;
}

interface TransactionContext {
  commit(): void;
  rollback(): void;
}

interface DataStore {
  beginTransaction(): TransactionContext;
  insertRow(table: string, data: unknown): Result<void, Error>;
  updateRow(table: string, id: string, data: unknown): Result<void, Error>;
  deleteRow(table: string, id: string): Result<void, Error>;
}

const dataStore: DataStore = {
  beginTransaction: () => ({
    commit: () => {},
    rollback: () => {},
  }),
  insertRow: () => ({ ok: true }),
  updateRow: () => ({ ok: true }),
  deleteRow: () => ({ ok: true }),
};

interface OrderData {
  userId: string;
  items: { productId: string; quantity: number }[];
  total: number;
}

interface TransferData {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
}

interface MigrationData {
  oldTable: string;
  newTable: string;
  recordIds: string[];
}

// ============================================================================
// VARIANT A: Create order transactionally
// ============================================================================

function createOrderTx(order: OrderData): Result<void, Error> {
  const tx = dataStore.beginTransaction();
  const orderResult = dataStore.insertRow("orders", { userId: order.userId, total: order.total });
  if (!orderResult.ok) {
    tx.rollback();
    return orderResult;
  }
  for (const item of order.items) {
    const itemResult = dataStore.insertRow("order_items", item);
    if (!itemResult.ok) {
      tx.rollback();
      return itemResult;
    }
  }
  tx.commit();
  return { ok: true };
}

// ============================================================================
// VARIANT B: Transfer funds transactionally
// ============================================================================

function transferFundsTx(transfer: TransferData): Result<void, Error> {
  const tx = dataStore.beginTransaction();
  const debitResult = dataStore.updateRow("accounts", transfer.fromAccountId, { debit: transfer.amount });
  if (!debitResult.ok) {
    tx.rollback();
    return debitResult;
  }
  const creditResult = dataStore.updateRow("accounts", transfer.toAccountId, { credit: transfer.amount });
  if (!creditResult.ok) {
    tx.rollback();
    return creditResult;
  }
  tx.commit();
  return { ok: true };
}

// ============================================================================
// VARIANT C: Migrate records transactionally
// ============================================================================

function migrateRecordsTx(migration: MigrationData): Result<void, Error> {
  const tx = dataStore.beginTransaction();
  for (const id of migration.recordIds) {
    const insertResult = dataStore.insertRow(migration.newTable, { migratedFrom: id });
    if (!insertResult.ok) {
      tx.rollback();
      return insertResult;
    }
    const deleteResult = dataStore.deleteRow(migration.oldTable, id);
    if (!deleteResult.ok) {
      tx.rollback();
      return deleteResult;
    }
  }
  tx.commit();
  return { ok: true };
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  createOrderTx,
  transferFundsTx,
  migrateRecordsTx,
  OrderData,
  TransferData,
  MigrationData,
};
