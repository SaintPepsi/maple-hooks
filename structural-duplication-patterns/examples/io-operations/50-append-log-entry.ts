// Pattern 50: Append-Log-Entry
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Format entry with timestamp -> append to file/stream

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface AuditEvent {
  action: string;
  userId: string;
  resourceId: string;
}

interface MetricPoint {
  name: string;
  value: number;
  tags: Record<string, string>;
}

interface ErrorReport {
  code: string;
  message: string;
  stack?: string;
}

function appendFileSync(_path: string, _content: string): void {}

function formatTimestamp(): string {
  return new Date().toISOString();
}

// ============================================================================
// VARIANT A: Append audit log entry
// ============================================================================

function logAuditEvent(logPath: string, event: AuditEvent): void {
  const timestamp = formatTimestamp();
  const entry = `${timestamp} AUDIT ${event.action} user=${event.userId} resource=${event.resourceId}\n`;
  appendFileSync(logPath, entry);
}

// ============================================================================
// VARIANT B: Append metric to log
// ============================================================================

function logMetric(logPath: string, metric: MetricPoint): void {
  const timestamp = formatTimestamp();
  const entry = `${timestamp} METRIC ${metric.name}=${metric.value} ${JSON.stringify(metric.tags)}\n`;
  appendFileSync(logPath, entry);
}

// ============================================================================
// VARIANT C: Append error to log
// ============================================================================

function logError(logPath: string, error: ErrorReport): void {
  const timestamp = formatTimestamp();
  const entry = `${timestamp} ERROR ${error.code}: ${error.message}\n`;
  appendFileSync(logPath, entry);
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  logAuditEvent,
  logMetric,
  logError,
  AuditEvent,
  MetricPoint,
  ErrorReport,
};
