// Pattern 3: Type-Switch-Dispatch
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Check type/discriminator -> branch to type-specific logic

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface ClickEvent {
  type: "click";
  x: number;
  y: number;
}

interface KeyEvent {
  type: "key";
  code: string;
}

interface ScrollEvent {
  type: "scroll";
  delta: number;
}

type UIEvent = ClickEvent | KeyEvent | ScrollEvent;

interface CreateAction {
  kind: "create";
  payload: unknown;
}

interface UpdateAction {
  kind: "update";
  id: string;
  changes: unknown;
}

interface DeleteAction {
  kind: "delete";
  id: string;
}

type DatabaseAction = CreateAction | UpdateAction | DeleteAction;

interface TextMessage {
  tag: "text";
  content: string;
}

interface ImageMessage {
  tag: "image";
  url: string;
}

interface VideoMessage {
  tag: "video";
  duration: number;
}

type ChatMessage = TextMessage | ImageMessage | VideoMessage;

// Placeholder for React element type (avoid JSX namespace dependency)
type ReactNode = { type: string; props: unknown } | null;

// Handler functions
function handleClick(event: ClickEvent): string {
  return `Clicked at ${event.x}, ${event.y}`;
}

function handleKey(event: KeyEvent): string {
  return `Key pressed: ${event.code}`;
}

function handleScroll(event: ScrollEvent): string {
  return `Scrolled by ${event.delta}`;
}

function handleDefaultEvent(): string {
  return "Unknown event";
}

function executeCreate(action: CreateAction): boolean {
  console.log("Creating:", action.payload);
  return true;
}

function executeUpdate(action: UpdateAction): boolean {
  console.log("Updating:", action.id, action.changes);
  return true;
}

function executeDelete(action: DeleteAction): boolean {
  console.log("Deleting:", action.id);
  return true;
}

function executeDefault(): boolean {
  return false;
}

function renderText(msg: TextMessage): ReactNode | null {
  return null; // Placeholder
}

function renderImage(msg: ImageMessage): ReactNode | null {
  return null; // Placeholder
}

function renderVideo(msg: VideoMessage): ReactNode | null {
  return null; // Placeholder
}

function renderDefault(): ReactNode | null {
  return null;
}

// ============================================================================
// VARIANT A: UI event dispatcher using 'type' discriminator
// ============================================================================

function dispatchUIEvent(event: UIEvent): string {
  if (event.type === "click") return handleClick(event);
  if (event.type === "key") return handleKey(event);
  if (event.type === "scroll") return handleScroll(event);
  return handleDefaultEvent();
}

// ============================================================================
// VARIANT B: Database action dispatcher using 'kind' discriminator
// ============================================================================

function dispatchDatabaseAction(action: DatabaseAction): boolean {
  if (action.kind === "create") return executeCreate(action);
  if (action.kind === "update") return executeUpdate(action);
  if (action.kind === "delete") return executeDelete(action);
  return executeDefault();
}

// ============================================================================
// VARIANT C: Chat message renderer using 'tag' discriminator
// ============================================================================

function dispatchChatMessage(message: ChatMessage): ReactNode | null {
  if (message.tag === "text") return renderText(message);
  if (message.tag === "image") return renderImage(message);
  if (message.tag === "video") return renderVideo(message);
  return renderDefault();
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  dispatchUIEvent,
  dispatchDatabaseAction,
  dispatchChatMessage,
  UIEvent,
  DatabaseAction,
  ChatMessage,
};
