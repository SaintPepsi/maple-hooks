// Pattern 43: Deep-Clone
// Shape: Recursively copy object/array

// === Types ===

interface FormState {
  fields: Record<string, string>;
  errors: Record<string, string[]>;
  metadata: {
    touched: Set<string>;
    submitted: boolean;
  };
}

interface TreeNode {
  value: string;
  children: TreeNode[];
}

interface AppState {
  user: {
    id: string;
    preferences: Record<string, unknown>;
  } | null;
  settings: {
    theme: string;
    notifications: {
      email: boolean;
      push: boolean;
    };
  };
  cache: Map<string, unknown>;
}

// === Variant A: Clone form state ===

function cloneFormState(state: FormState): FormState {
  if (state === null || typeof state !== 'object') {
    return state;
  }

  return {
    fields: { ...state.fields },
    errors: Object.fromEntries(
      Object.entries(state.errors).map(([k, v]) => [k, [...v]])
    ),
    metadata: {
      touched: new Set(state.metadata.touched),
      submitted: state.metadata.submitted,
    },
  };
}

// === Variant B: Clone tree structure ===

function cloneTree(node: TreeNode): TreeNode {
  if (node === null || typeof node !== 'object') {
    return node;
  }

  return {
    value: node.value,
    children: node.children.map((child) => cloneTree(child)),
  };
}

function cloneTreeNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.map((node) => cloneTree(node));
}

// === Variant C: Generic deep clone ===

function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  if (value instanceof Set) {
    return new Set(Array.from(value).map((item) => deepClone(item))) as unknown as T;
  }

  if (value instanceof Map) {
    return new Map(
      Array.from(value.entries()).map(([k, v]) => [deepClone(k), deepClone(v)])
    ) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as unknown as T;
  }

  const result = {} as Record<string, unknown>;
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      result[key] = deepClone((value as Record<string, unknown>)[key]);
    }
  }
  return result as T;
}

// === Clone with circular reference handling ===

function deepCloneWithCircular<T>(
  value: T,
  seen = new WeakMap<object, unknown>()
): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value as object)) {
    return seen.get(value as object) as T;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  if (Array.isArray(value)) {
    const arrClone: unknown[] = [];
    seen.set(value, arrClone);
    for (const item of value) {
      arrClone.push(deepCloneWithCircular(item, seen));
    }
    return arrClone as unknown as T;
  }

  const objClone = {} as Record<string, unknown>;
  seen.set(value as object, objClone);
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      objClone[key] = deepCloneWithCircular(
        (value as Record<string, unknown>)[key],
        seen
      );
    }
  }
  return objClone as T;
}

// === Simple shallow clone for comparison ===

function shallowClone<T extends object>(value: T): T {
  if (Array.isArray(value)) {
    return [...value] as unknown as T;
  }
  return { ...value };
}

// === Exports ===

export {
  cloneFormState,
  cloneTree,
  cloneTreeNodes,
  deepClone,
  deepCloneWithCircular,
  shallowClone,
};

export type { FormState, TreeNode, AppState };
