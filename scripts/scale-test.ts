import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL is required');
}

const totalMessages = Number(process.env.SCALE_MESSAGES || 5000);
const batchSize = Number(process.env.SCALE_BATCH_SIZE || 200);
const provider = (process.env.SCALE_PROVIDER || 'waba').toLowerCase();
const withMediaRate = Number(process.env.SCALE_MEDIA_RATE || 0.1);

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const queue = new Queue('inbound-events', { connection });

function buildEvent(index: number) {
  const eventId = `scale-${Date.now()}-${index}`;
  const hasMedia = Math.random() < withMediaRate;
  return {
    provider,
    eventId,
    tenantId: 'tenant-scale',
    contactId: `contact-${index}`,
    normalizedPayload: {
      to: `+100000${index}`,
      body: `scale-test-${index}`,
      mediaUrl: hasMedia ? `https://example.com/${eventId}.png` : undefined,
    },
  };
}

async function enqueueBatch(startIndex: number, count: number) {
  const jobs = Array.from({ length: count }, (_, idx) => {
    const event = buildEvent(startIndex + idx);
    return {
      name: 'inbound-event',
      data: {
        event,
        requestId: `req-${event.eventId}`,
        correlationId: `corr-${event.eventId}`,
      },
      opts: {
        jobId: `${event.provider}:${event.eventId}`,
      },
    };
  });

  await queue.addBulk(jobs);
}

async function run() {
  const startedAt = Date.now();
  let sent = 0;

  while (sent < totalMessages) {
    const remaining = totalMessages - sent;
    const count = Math.min(batchSize, remaining);
    await enqueueBatch(sent, count);
    sent += count;
    if (sent % (batchSize * 5) === 0 || sent === totalMessages) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`[scale-test] enqueued ${sent}/${totalMessages} in ${elapsed}s`);
    }
  }

  await connection.quit();
  console.log('[scale-test] done');
}

run().catch((error) => {
  console.error('[scale-test] failed', error);
  process.exitCode = 1;
});
