// Pattern 84: Plugin-Register
// Plugin registration systems with hooks and extension points

// Variant A: Build Tool Plugin System
interface BuildPlugin {
  name: string;
  onBefore?: (context: BuildContext) => void;
  onAfter?: (context: BuildContext) => void;
  transform?: (source: string) => string;
}

interface BuildContext {
  outDir: string;
  files: string[];
}

function createBuildSystem() {
  const plugins: BuildPlugin[] = [];

  return {
    register(plugin: BuildPlugin) {
      plugins.push(plugin);
      return this;
    },
    async build(context: BuildContext) {
      for (const plugin of plugins) {
        plugin.onBefore?.(context);
      }
      // Build logic here
      for (const plugin of plugins) {
        plugin.onAfter?.(context);
      }
    },
  };
}

// Variant B: Editor Plugin System
interface EditorPlugin {
  id: string;
  commands?: Record<string, () => void>;
  keybindings?: Record<string, string>;
  activate?: () => void;
  deactivate?: () => void;
}

function createEditorPluginManager() {
  const registry = new Map<string, EditorPlugin>();

  return {
    register(plugin: EditorPlugin) {
      registry.set(plugin.id, plugin);
      plugin.activate?.();
      return this;
    },
    unregister(id: string) {
      const plugin = registry.get(id);
      plugin?.deactivate?.();
      registry.delete(id);
    },
    executeCommand(pluginId: string, command: string) {
      const plugin = registry.get(pluginId);
      plugin?.commands?.[command]?.();
    },
  };
}

// Variant C: Validation Plugin System
interface ValidationPlugin {
  name: string;
  validate: (value: unknown) => { valid: boolean; errors: string[] };
}

function createValidator() {
  const plugins: ValidationPlugin[] = [];

  return {
    use(plugin: ValidationPlugin) {
      plugins.push(plugin);
      return this;
    },
    validate(value: unknown) {
      const allErrors: string[] = [];
      for (const plugin of plugins) {
        const result = plugin.validate(value);
        if (!result.valid) {
          allErrors.push(...result.errors);
        }
      }
      return { valid: allErrors.length === 0, errors: allErrors };
    },
  };
}

export { createBuildSystem, createEditorPluginManager, createValidator };
