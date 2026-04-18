// Pattern 63: State-Machine-Transition
// Finite state machine with valid transitions

// Variant A: Order state machine
type OrderState = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

interface OrderStateMachine {
  state: OrderState;
  transition(action: string): boolean;
  canTransition(action: string): boolean;
}

const orderTransitions: Record<OrderState, Record<string, OrderState>> = {
  pending: { confirm: "confirmed", cancel: "cancelled" },
  confirmed: { ship: "shipped", cancel: "cancelled" },
  shipped: { deliver: "delivered" },
  delivered: {},
  cancelled: {},
};

function createOrderStateMachine(initial: OrderState = "pending"): OrderStateMachine {
  let currentState = initial;

  return {
    get state() {
      return currentState;
    },
    canTransition(action: string): boolean {
      return action in orderTransitions[currentState];
    },
    transition(action: string): boolean {
      const nextState = orderTransitions[currentState][action];
      if (!nextState) return false;
      currentState = nextState;
      return true;
    },
  };
}

// Variant B: Authentication state machine
type AuthState = "anonymous" | "authenticating" | "authenticated" | "error" | "locked";

interface AuthStateMachine {
  state: AuthState;
  attemptLogin(): void;
  loginSuccess(): void;
  loginFailure(): void;
  logout(): void;
}

const authTransitions: Record<AuthState, Partial<Record<string, AuthState>>> = {
  anonymous: { attemptLogin: "authenticating" },
  authenticating: { success: "authenticated", failure: "error" },
  authenticated: { logout: "anonymous" },
  error: { attemptLogin: "authenticating", lock: "locked" },
  locked: { unlock: "anonymous" },
};

function createAuthStateMachine(): AuthStateMachine {
  let currentState: AuthState = "anonymous";
  let failureCount = 0;

  const doTransition = (action: string): boolean => {
    const nextState = authTransitions[currentState][action];
    if (!nextState) return false;
    currentState = nextState;
    return true;
  };

  return {
    get state() {
      return currentState;
    },
    attemptLogin() {
      doTransition("attemptLogin");
    },
    loginSuccess() {
      failureCount = 0;
      doTransition("success");
    },
    loginFailure() {
      failureCount++;
      if (failureCount >= 3) {
        doTransition("lock");
      } else {
        doTransition("failure");
      }
    },
    logout() {
      doTransition("logout");
    },
  };
}

// Variant C: Document workflow state machine
type DocState = "draft" | "review" | "approved" | "published" | "archived";

class DocumentStateMachine {
  private state: DocState = "draft";
  private readonly transitions: Record<DocState, DocState[]> = {
    draft: ["review"],
    review: ["draft", "approved"],
    approved: ["published", "review"],
    published: ["archived"],
    archived: [],
  };

  getState(): DocState {
    return this.state;
  }

  getAvailableTransitions(): DocState[] {
    return this.transitions[this.state];
  }

  transitionTo(target: DocState): boolean {
    if (!this.transitions[this.state].includes(target)) {
      return false;
    }
    this.state = target;
    return true;
  }
}
