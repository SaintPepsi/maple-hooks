// Pattern 83: Middleware-Chain
// Middleware pattern with next() function chaining

// Variant A: HTTP Middleware Chain
interface HttpRequest {
  path: string;
  headers: Record<string, string>;
  body?: unknown;
}

interface HttpResponse {
  status: number;
  body: unknown;
}

type HttpMiddleware = (
  req: HttpRequest,
  res: HttpResponse,
  next: () => Promise<void>
) => Promise<void>;

function createMiddlewareChain(
  ...middlewares: HttpMiddleware[]
): (req: HttpRequest, res: HttpResponse) => Promise<void> {
  return async (req, res) => {
    let index = 0;
    const next = async (): Promise<void> => {
      if (index < middlewares.length) {
        const middleware = middlewares[index++];
        await middleware(req, res, next);
      }
    };
    await next();
  };
}

// Variant B: Message Processing Middleware
interface Message {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
}

type MessageMiddleware = (
  msg: Message,
  next: () => Promise<Message>
) => Promise<Message>;

function createMessageChain(
  ...middlewares: MessageMiddleware[]
): (msg: Message) => Promise<Message> {
  return async (msg) => {
    let index = middlewares.length - 1;
    const buildChain = (): (() => Promise<Message>) => {
      if (index < 0) return async () => msg;
      const middleware = middlewares[index--];
      const nextFn = buildChain();
      return () => middleware(msg, nextFn);
    };
    return buildChain()();
  };
}

// Variant C: Command Handler Middleware
interface Command {
  name: string;
  args: string[];
  context: Record<string, unknown>;
}

type CommandMiddleware = (
  cmd: Command,
  next: () => void
) => void;

function createCommandChain(...middlewares: CommandMiddleware[]) {
  return (cmd: Command) => {
    let index = 0;
    const next = () => {
      if (index < middlewares.length) {
        middlewares[index++](cmd, next);
      }
    };
    next();
  };
}

export { createMiddlewareChain, createMessageChain, createCommandChain };
