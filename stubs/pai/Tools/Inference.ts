export type InferenceLevel = "fast" | "standard" | "smart";

/** Represents any value that can appear in a JSON document. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface InferenceOptions {
  prompt: string;
  level?: InferenceLevel;
  systemPrompt?: string;
  format?: string;
  timeout?: number;
}

export interface InferenceResult {
  success: boolean;
  output: string;
  /** Parsed JSON response — shape is prompt-dependent; callers narrow via type guard or assertion. */
  parsed?: unknown;
  error?: string;
  latencyMs: number;
  level: InferenceLevel;
}

export async function inference(_options: InferenceOptions): Promise<InferenceResult> {
  throw new Error("@pai/Tools/Inference stub — inject real implementation via Deps");
}
