// Pattern 82: Curry-Partial
// Currying and partial application to pre-fill function arguments

// Variant A: Logger with Level Currying
type LogLevel = "debug" | "info" | "warn" | "error";

function createLevelLogger(level: LogLevel) {
  return function (prefix: string) {
    return function (message: string) {
      console.log(`[${level.toUpperCase()}] ${prefix}: ${message}`);
    };
  };
}

const debugLogger = createLevelLogger("debug");
const appDebug = debugLogger("app");
const dbDebug = debugLogger("database");

// Variant B: API Request with Base URL Partial
function createApiRequest(baseUrl: string) {
  return function (method: "GET" | "POST" | "PUT" | "DELETE") {
    return function (path: string) {
      return fetch(`${baseUrl}${path}`, { method });
    };
  };
}

const apiV1 = createApiRequest("https://api.example.com/v1");
const getV1 = apiV1("GET");
const postV1 = apiV1("POST");

// Variant C: Event Handler with Context Currying
interface EventContext {
  userId: string;
  sessionId: string;
}

function createEventHandler(context: EventContext) {
  return function (eventType: string) {
    return function (payload: Record<string, unknown>) {
      return {
        ...payload,
        type: eventType,
        userId: context.userId,
        sessionId: context.sessionId,
        timestamp: Date.now(),
      };
    };
  };
}

const userContext = { userId: "123", sessionId: "abc" };
const handleUserEvent = createEventHandler(userContext);
const handleClick = handleUserEvent("click");
const handleScroll = handleUserEvent("scroll");

export {
  createLevelLogger,
  createApiRequest,
  createEventHandler,
  appDebug,
  dbDebug,
  getV1,
  postV1,
  handleClick,
  handleScroll,
};
