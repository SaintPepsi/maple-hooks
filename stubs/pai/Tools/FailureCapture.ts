export interface FailureCaptureInput {
  transcriptPath?: string;
  rating?: number;
  sentimentSummary?: string;
  detailedContext?: string;
  sessionId?: string;
}

export async function captureFailure(_input: FailureCaptureInput): Promise<string | null> {
  throw new Error("@pai/Tools/FailureCapture stub — inject real implementation via Deps");
}
