import type { Job } from 'bullmq';
import { startInboundProcessor } from '../inbound.processor';
import { startOutboundProcessor } from '../outbound.processor';
import { enqueueDeadLetter } from '../dead-letter';
import { incrementQueueMetric } from '../../observability/queue-metrics';
import { getProviderByName, resolveProviderName } from '@samachat/messaging';

type WorkerInstance = {
  name: string;
  processor: (job: Job<any>) => Promise<any>;
  on: jest.Mock;
  __handlers: Record<string, (job?: any, error?: any) => Promise<void>>;
};

const workerState: WorkerInstance[] = [];

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation((name, processor) => {
    const handlers: Record<string, any> = {};
    const instance = {
      name,
      processor,
      on: jest.fn((event: string, handler: any) => {
        handlers[event] = handler;
      }),
      __handlers: handlers,
    };
    workerState.push(instance);
    return instance;
  }),
  Queue: jest.fn(),
}));

jest.mock('@opentelemetry/api', () => ({
  context: {
    with: (_ctx: unknown, fn: () => Promise<any>) => fn(),
  },
}));

jest.mock('@samachat/logger', () => ({
  getLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
  createJobLoggerContext: jest.fn(() => ({})),
}));

jest.mock('@samachat/messaging', () => ({
  getProviderByName: jest.fn(),
  resolveProviderName: jest.fn(),
}));

jest.mock('../../observability/trace', () => ({
  extractTraceContext: jest.fn(() => ({})),
  injectTraceContext: jest.fn(() => ({})),
  getTracer: () => ({
    startActiveSpan: async (_name: string, fn: (span: any) => Promise<any>) => {
      const span = {
        setAttribute: jest.fn(),
        recordException: jest.fn(),
        end: jest.fn(),
      };
      return fn(span);
    },
  }),
}));

jest.mock('../../observability/queue-metrics', () => ({
  incrementQueueMetric: jest.fn(),
}));

jest.mock('../dead-letter', () => ({
  enqueueDeadLetter: jest.fn(),
}));

jest.mock('../backpressure', () => ({
  applyQueueBackpressure: jest.fn().mockResolvedValue(0),
}));

jest.mock('../redis-lock', () => ({
  acquireQueueLock: jest.fn().mockResolvedValue('lock-token'),
  releaseQueueLock: jest.fn().mockResolvedValue(undefined),
}));

describe('worker queues', () => {
  const connection = {} as any;
  const queues = {
    outboundMessagesQueue: { add: jest.fn() },
    mediaDownloadQueue: { add: jest.fn() },
    deadLetterQueue: { add: jest.fn() },
  } as any;

  beforeEach(() => {
    workerState.length = 0;
    jest.clearAllMocks();
  });

  it('enqueues outbound and media download jobs', async () => {
    (resolveProviderName as jest.Mock).mockReturnValue('waba');

    startInboundProcessor(connection, queues);
    const worker = workerState[0];

    const job = {
      id: 'job-1',
      data: {
        event: {
          eventId: 'event-1',
          tenantId: 'tenant-1',
          contactId: 'contact-1',
          normalizedPayload: { body: 'hi', mediaUrl: 'https://example.com/a.png' },
        },
        requestId: 'req-1',
        correlationId: 'corr-1',
      },
    } as Job<any>;

    await worker.processor(job);

    expect(queues.outboundMessagesQueue.add).toHaveBeenCalledWith(
      'outbound-message',
      expect.objectContaining({
        provider: 'waba',
        eventId: 'event-1',
        requestId: 'req-1',
        correlationId: 'corr-1',
        tenantId: 'tenant-1',
      }),
      { jobId: 'event-1:waba' },
    );

    expect(queues.mediaDownloadQueue.add).toHaveBeenCalledWith(
      'media-download',
      expect.objectContaining({
        mediaUrl: 'https://example.com/a.png',
        provider: 'waba',
      }),
      { jobId: 'event-1:waba:media' },
    );
  });

  it('processes outbound jobs via provider', async () => {
    (getProviderByName as jest.Mock).mockReturnValue({
      sendMessage: jest.fn().mockResolvedValue({ messageId: 'm1', status: 'sent' }),
    });

    startOutboundProcessor(connection, queues);
    const worker = workerState[0];

    const job = {
      id: 'job-2',
      data: {
        provider: 'waba',
        input: { to: '123', body: 'hi' },
      },
    } as Job<any>;

    const result = await worker.processor(job);
    expect(result).toEqual({ messageId: 'm1', status: 'sent' });
    expect(getProviderByName).toHaveBeenCalledWith('waba');
  });

  it('tracks retries without DLQ when attempts remain', async () => {
    startOutboundProcessor(connection, queues);
    const worker = workerState[0];

    const job = {
      id: 'job-3',
      attemptsMade: 1,
      opts: { attempts: 3 },
      data: { provider: 'waba' },
    } as Job<any>;

    await worker.__handlers.failed(job, new Error('fail'));

    expect(incrementQueueMetric).toHaveBeenCalledWith(
      connection,
      'outbound-messages',
      'retries',
    );
    expect(enqueueDeadLetter).not.toHaveBeenCalled();
  });

  it('moves jobs to DLQ when retries exhausted', async () => {
    startOutboundProcessor(connection, queues);
    const worker = workerState[0];

    const job = {
      id: 'job-4',
      attemptsMade: 3,
      opts: { attempts: 3 },
      data: { provider: 'waba' },
    } as Job<any>;

    await worker.__handlers.failed(job, new Error('fail'));

    expect(incrementQueueMetric).toHaveBeenCalledWith(
      connection,
      'outbound-messages',
      'failed',
    );
    expect(enqueueDeadLetter).toHaveBeenCalled();
  });
});
