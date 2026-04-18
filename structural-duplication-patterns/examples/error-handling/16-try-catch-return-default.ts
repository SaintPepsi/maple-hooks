// Pattern 16: Try-Catch-Return-Default
// Shape: Try operation → catch error → return default value

// Variant A
function parseUserJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

// Variant B
function parseConfigYaml(text: string): Record<string, unknown> {
  try {
    return parseYaml(text);
  } catch {
    return {};
  }
}

// Variant C
function parseSettingsToml(text: string): Record<string, unknown> {
  try {
    return parseToml(text);
  } catch {
    return {};
  }
}

// Placeholder functions for compilation
declare function parseYaml(text: string): Record<string, unknown>;
declare function parseToml(text: string): Record<string, unknown>;

export { parseUserJson, parseConfigYaml, parseSettingsToml };
