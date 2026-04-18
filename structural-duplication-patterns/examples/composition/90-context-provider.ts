// Pattern 90: Context-Provider
// Context providers passing data through function call chains

// Variant A: Request Context Provider
interface RequestContext {
  requestId: string;
  userId: string | null;
  startTime: number;
}

function createRequestContextProvider(): RequestContext {
  return {
    requestId: crypto.randomUUID(),
    userId: null,
    startTime: Date.now(),
  };
}

function withRequestContext<T>(
  ctx: RequestContext,
  fn: (ctx: RequestContext) => T
): T {
  return fn(ctx);
}

function handleRequest(ctx: RequestContext) {
  console.log(`Handling request ${ctx.requestId}`);
  return processRequest(ctx);
}

function processRequest(ctx: RequestContext) {
  console.log(`Processing for user ${ctx.userId}`);
  return { requestId: ctx.requestId, duration: Date.now() - ctx.startTime };
}

// Variant B: Database Transaction Context (using Result pattern)
interface TransactionContext {
  transactionId: string;
  connection: { query: (sql: string) => Promise<unknown[]> };
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

type TransactionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error };

function createTransactionContextProvider(
  _connectionPool: unknown
): TransactionContext {
  const transactionId = crypto.randomUUID();
  return {
    transactionId,
    connection: {
      async query(sql: string) {
        console.log(`[${transactionId}] ${sql}`);
        return [];
      },
    },
    async commit() {
      console.log(`Committing ${transactionId}`);
    },
    async rollback() {
      console.log(`Rolling back ${transactionId}`);
    },
  };
}

async function withTransaction<T>(
  pool: unknown,
  fn: (ctx: TransactionContext) => Promise<T>
): Promise<TransactionResult<T>> {
  const ctx = createTransactionContextProvider(pool);
  const result = await fn(ctx).then(
    (value) => ({ ok: true as const, value }),
    (error) => ({ ok: false as const, error: error as Error })
  );

  if (result.ok) {
    await ctx.commit();
  } else {
    await ctx.rollback();
  }

  return result;
}

// Variant C: Logger Context Provider (using Result pattern)
interface LogContext {
  correlationId: string;
  serviceName: string;
  debug(msg: string): void;
  info(msg: string): void;
  error(msg: string, err?: Error): void;
}

type LogResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error };

function createLogContextProvider(serviceName: string): LogContext {
  const correlationId = crypto.randomUUID();
  const format = (level: string, msg: string) =>
    `[${correlationId}] [${serviceName}] ${level}: ${msg}`;

  return {
    correlationId,
    serviceName,
    debug(msg) {
      console.log(format("DEBUG", msg));
    },
    info(msg) {
      console.log(format("INFO", msg));
    },
    error(msg, err) {
      console.error(format("ERROR", msg), err);
    },
  };
}

function withLogging<T>(
  serviceName: string,
  fn: (ctx: LogContext) => T
): LogResult<T> {
  const ctx = createLogContextProvider(serviceName);
  ctx.info("Operation started");

  const execute = (): LogResult<T> => {
    const result = fn(ctx);
    ctx.info("Operation completed");
    return { ok: true, value: result };
  };

  return execute();
}

export {
  createRequestContextProvider,
  withRequestContext,
  handleRequest,
  createTransactionContextProvider,
  withTransaction,
  createLogContextProvider,
  withLogging,
};
