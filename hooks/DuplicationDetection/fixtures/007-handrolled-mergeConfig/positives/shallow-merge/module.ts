/**
 * Shallow merge that only copies defined values from partial into target.
 */
export function mergeConfig<T extends object>(target: T, partial: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(partial) as (keyof T)[]) {
    if (partial[key] !== undefined) {
      result[key] = partial[key] as T[keyof T];
    }
  }
  return result;
}
