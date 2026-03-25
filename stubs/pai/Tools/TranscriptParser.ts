export interface StructuredResponse {
  taskLine?: string;
  phaseLine?: string;
  voiceLine?: string;
  sections: string[];
}

export type ResponseState = "idle" | "working" | "complete" | "error" | "awaitingInput";

export interface ParsedTranscript {
  raw: string;
  lastMessage: string;
  currentResponseText: string;
  voiceCompletion: string;
  plainCompletion: string;
  structured: StructuredResponse;
  responseState: ResponseState;
}

export function parseTranscript(_transcriptPath: string): ParsedTranscript {
  throw new Error("@pai/Tools/TranscriptParser stub — inject real implementation via Deps");
}

export function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c: unknown) => {
        if (typeof c === "string") return c;
        if (c && typeof c === "object" && "text" in c) return (c as { text: string }).text;
        return "";
      })
      .join(" ")
      .trim();
  }
  return "";
}
