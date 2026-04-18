// Pattern 12: Break-On-Condition
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Loop until condition met, then break

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface Message {
  id: string;
  content: string;
  priority: number;
}

interface Job {
  id: string;
  name: string;
  failed: boolean;
}

interface Packet {
  id: string;
  data: Buffer;
  isTerminal: boolean;
}

function sendMessage(message: Message): void {
  console.log(`Sending message: ${message.content}`);
}

function isHighPriority(message: Message): boolean {
  return message.priority > 8;
}

function executeJob(job: Job): void {
  console.log(`Executing job: ${job.name}`);
}

function hasFailure(job: Job): boolean {
  return job.failed;
}

function transmitPacket(packet: Packet): void {
  console.log(`Transmitting packet: ${packet.id}`);
}

function isEndOfStream(packet: Packet): boolean {
  return packet.isTerminal;
}

// ============================================================================
// VARIANT A: Process messages until high priority found
// ============================================================================

function processMessagesUntilHighPriority(messages: Message[]): void {
  for (const message of messages) {
    sendMessage(message);
    if (isHighPriority(message)) {
      break;
    }
  }
}

// ============================================================================
// VARIANT B: Execute jobs until failure encountered
// ============================================================================

function executeJobsUntilFailure(jobs: Job[]): void {
  for (const job of jobs) {
    executeJob(job);
    if (hasFailure(job)) {
      break;
    }
  }
}

// ============================================================================
// VARIANT C: Transmit packets until end of stream
// ============================================================================

function transmitUntilEndOfStream(packets: Packet[]): void {
  for (const packet of packets) {
    transmitPacket(packet);
    if (isEndOfStream(packet)) {
      break;
    }
  }
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  processMessagesUntilHighPriority,
  executeJobsUntilFailure,
  transmitUntilEndOfStream,
  Message,
  Job,
  Packet,
};
