/**
 * Effect Schema for transcript JSONL entries.
 *
 * Shared by RelationshipMemory and RatingCapture hooks for parsing
 * session transcript files (*.jsonl).
 */

import type { ResultError } from "@hooks/core/error";
import { schemaDecodeFailed } from "@hooks/core/error";
import type { Result } from "@hooks/core/result";
import { Schema } from "effect";

// ─── Content Block Schema ───────────────────────────────────────────────────

const ContentBlockSchema = Schema.mutable(
  Schema.Struct({
    type: Schema.String,
    text: Schema.optional(Schema.String),
  }),
);

type ContentBlock = typeof ContentBlockSchema.Type;

// ─── Message Schema ─────────────────────────────────────────────────────────

const MessageSchema = Schema.mutable(
  Schema.Struct({
    content: Schema.Union(Schema.String, Schema.mutable(Schema.Array(ContentBlockSchema))),
  }),
);

type TranscriptMessage = typeof MessageSchema.Type;

// ─── Transcript Entry Schema ────────────────────────────────────────────────

export const TranscriptEntrySchema = Schema.mutable(
  Schema.Struct({
    type: Schema.Literal("user", "assistant"),
    message: Schema.optional(MessageSchema),
  }),
);

export type TranscriptEntry = typeof TranscriptEntrySchema.Type;

// ─── Parse Function ─────────────────────────────────────────────────────────

const decodeTranscriptEntry = Schema.decodeUnknownEither(TranscriptEntrySchema);

/**
 * Parse a JSON value as a TranscriptEntry.
 * Returns Result<TranscriptEntry, ResultError> for use in Result pipelines.
 */
export function parseTranscriptEntry(json: unknown): Result<TranscriptEntry, ResultError> {
  const result = decodeTranscriptEntry(json);
  if (result._tag === "Right") {
    return { ok: true, value: result.right };
  }
  return { ok: false, error: schemaDecodeFailed("TranscriptEntry", result.left) };
}

// ─── Re-exports for convenience ─────────────────────────────────────────────

export type { ContentBlock, TranscriptMessage };
