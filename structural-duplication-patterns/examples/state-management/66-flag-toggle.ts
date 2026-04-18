// Pattern 66: Flag-Toggle
// Boolean flags with toggle, enable, disable operations

// Variant A: Feature flags
interface FeatureFlags {
  isEnabled(feature: string): boolean;
  enable(feature: string): void;
  disable(feature: string): void;
  toggle(feature: string): boolean;
}

function createFeatureFlags(defaults: Record<string, boolean> = {}): FeatureFlags {
  const flags = new Map<string, boolean>(Object.entries(defaults));

  return {
    isEnabled(feature: string): boolean {
      return flags.get(feature) ?? false;
    },
    enable(feature: string): void {
      flags.set(feature, true);
    },
    disable(feature: string): void {
      flags.set(feature, false);
    },
    toggle(feature: string): boolean {
      const current = flags.get(feature) ?? false;
      const newValue = !current;
      flags.set(feature, newValue);
      return newValue;
    },
  };
}

// Variant B: UI visibility toggles
interface VisibilityState {
  sidebar: boolean;
  modal: boolean;
  tooltip: boolean;
  dropdown: boolean;
}

class VisibilityController {
  private state: VisibilityState = {
    sidebar: true,
    modal: false,
    tooltip: false,
    dropdown: false,
  };

  isVisible(element: keyof VisibilityState): boolean {
    return this.state[element];
  }

  show(element: keyof VisibilityState): void {
    this.state[element] = true;
  }

  hide(element: keyof VisibilityState): void {
    this.state[element] = false;
  }

  toggle(element: keyof VisibilityState): boolean {
    this.state[element] = !this.state[element];
    return this.state[element];
  }

  hideAll(): void {
    for (const key of Object.keys(this.state) as (keyof VisibilityState)[]) {
      this.state[key] = false;
    }
  }
}

// Variant C: Debug mode flags with logging
interface DebugFlags {
  verbose: boolean;
  tracing: boolean;
  profiling: boolean;
}

class DebugController {
  private flags: DebugFlags = {
    verbose: false,
    tracing: false,
    profiling: false,
  };
  private readonly onChange?: (flag: keyof DebugFlags, value: boolean) => void;

  constructor(onChange?: (flag: keyof DebugFlags, value: boolean) => void) {
    this.onChange = onChange;
  }

  get(flag: keyof DebugFlags): boolean {
    return this.flags[flag];
  }

  set(flag: keyof DebugFlags, value: boolean): void {
    if (this.flags[flag] !== value) {
      this.flags[flag] = value;
      this.onChange?.(flag, value);
    }
  }

  toggle(flag: keyof DebugFlags): boolean {
    const newValue = !this.flags[flag];
    this.set(flag, newValue);
    return newValue;
  }

  enableAll(): void {
    for (const key of Object.keys(this.flags) as (keyof DebugFlags)[]) {
      this.set(key, true);
    }
  }

  disableAll(): void {
    for (const key of Object.keys(this.flags) as (keyof DebugFlags)[]) {
      this.set(key, false);
    }
  }
}
