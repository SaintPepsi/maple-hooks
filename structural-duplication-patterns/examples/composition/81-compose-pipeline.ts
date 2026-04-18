// Pattern 81: Compose-Pipeline
// Composing multiple functions into a single pipeline

// Variant A: Data Processing Pipeline
type Transform<T> = (input: T) => T;

function composePipeline<T>(...transforms: Transform<T>[]): Transform<T> {
  return (input: T) => transforms.reduce((acc, fn) => fn(acc), input);
}

const trimString: Transform<string> = (s) => s.trim();
const lowerCase: Transform<string> = (s) => s.toLowerCase();
const removeSpaces: Transform<string> = (s) => s.replace(/\s+/g, "-");

const slugify = composePipeline(trimString, lowerCase, removeSpaces);

// Variant B: Async Pipeline
type AsyncStep<T> = (input: T) => Promise<T>;

function composeAsync<T>(...steps: AsyncStep<T>[]): AsyncStep<T> {
  return async (input: T) => {
    let result = input;
    for (const step of steps) {
      result = await step(result);
    }
    return result;
  };
}

const validateOrder: AsyncStep<{ total: number }> = async (order) => {
  if (order.total <= 0) throw new Error("Invalid total");
  return order;
};
const applyDiscount: AsyncStep<{ total: number }> = async (order) => ({
  total: order.total * 0.9,
});
const calculateTax: AsyncStep<{ total: number }> = async (order) => ({
  total: order.total * 1.1,
});

const processOrder = composeAsync(validateOrder, applyDiscount, calculateTax);

// Variant C: Request Handler Pipeline
type RequestHandler = (req: Request, res: Response) => Promise<void>;
type HandlerComposer = (...handlers: RequestHandler[]) => RequestHandler;

interface Request {
  body: unknown;
  headers: Record<string, string>;
}
interface Response {
  status: number;
  data: unknown;
}

const composeHandlers: HandlerComposer = (...handlers) => {
  return async (req, res) => {
    for (const handler of handlers) {
      await handler(req, res);
    }
  };
};

export { composePipeline, composeAsync, composeHandlers, slugify, processOrder };
