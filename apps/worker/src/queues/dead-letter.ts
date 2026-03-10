import type { Job, Queue } from 'bullmq';
import { injectTraceContext, TraceCarrier } from '../observability/trace';

export interface DeadLetterPayload {
  originalJobId?: string | number;
  queue: string;
  reason: string;
  failedAt: string;
  data?: unknown;
  context?: Record<string, unknown>;
  trace?: TraceCarrier;
}

export async function enqueueDeadLetter(
  queue: Queue,
  job: Job,
  reason: string,
  context?: Record<string, unknown>,
): Promise<void> {
  const payload: DeadLetterPayload = {
    originalJobId: job.id,
    queue: job.queueName,
    reason,
    failedAt: new Date().toISOString(),
    data: job.data,
    context,
    trace: injectTraceContext(),
  };

  await queue.add('dead-letter', payload, {
    jobId: `${job.queueName}:${job.id}`,
  });
}
