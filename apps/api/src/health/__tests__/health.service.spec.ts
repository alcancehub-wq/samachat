import { HealthService } from '../health.service';
import { getConfig } from '@samachat/config';
import { createQueueClients } from '../../observability/queues';

type MockQueue = { getJobCounts: jest.Mock };

type RedisMock = {
  ping: jest.Mock;
  get: jest.Mock;
};

const redisInstances: RedisMock[] = [];

jest.mock('@samachat/config', () => ({
  getConfig: jest.fn(),
}));

jest.mock('../../observability/queues', () => ({
  createQueueClients: jest.fn(),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    const instance = {
      ping: jest.fn(),
      get: jest.fn(),
    };
    redisInstances.push(instance);
    return instance;
  });
});

describe('HealthService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    redisInstances.length = 0;
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reports missing redis when redisUrl is unset', async () => {
    (getConfig as jest.Mock).mockReturnValue({ redisUrl: undefined });

    const service = new HealthService();
    await expect(service.checkRedis()).resolves.toEqual({
      ok: false,
      detail: 'REDIS_URL not set',
    });
  });

  it('reports redis ok when ping succeeds', async () => {
    (getConfig as jest.Mock).mockReturnValue({ redisUrl: 'redis://test' });
    (createQueueClients as jest.Mock).mockReturnValue([]);

    const service = new HealthService();
    const redis = redisInstances[0];
    if (!redis) {
      throw new Error('Redis instance was not created.');
    }
    redis.ping.mockResolvedValueOnce('PONG');

    await expect(service.checkRedis()).resolves.toEqual({ ok: true });
  });

  it('reports redis errors when ping fails', async () => {
    (getConfig as jest.Mock).mockReturnValue({ redisUrl: 'redis://test' });
    (createQueueClients as jest.Mock).mockReturnValue([]);

    const service = new HealthService();
    const redis = redisInstances[0];
    if (!redis) {
      throw new Error('Redis instance was not created.');
    }
    redis.ping.mockRejectedValueOnce(new Error('boom'));

    await expect(service.checkRedis()).resolves.toEqual({
      ok: false,
      detail: 'boom',
    });
  });

  it('reports queues not initialized when empty', async () => {
    (getConfig as jest.Mock).mockReturnValue({ redisUrl: 'redis://test' });
    (createQueueClients as jest.Mock).mockReturnValue([]);

    const service = new HealthService();

    await expect(service.checkQueues()).resolves.toEqual({
      ok: false,
      detail: 'Queues not initialized',
    });
  });

  it('reports queues ok when queue checks succeed', async () => {
    (getConfig as jest.Mock).mockReturnValue({ redisUrl: 'redis://test' });
    const queue: MockQueue = { getJobCounts: jest.fn().mockResolvedValue({}) };
    (createQueueClients as jest.Mock).mockReturnValue([queue]);

    const service = new HealthService();

    await expect(service.checkQueues()).resolves.toEqual({ ok: true });
    expect(queue.getJobCounts).toHaveBeenCalledWith('waiting');
  });

  it('reports heartbeat missing when no payload', async () => {
    (getConfig as jest.Mock).mockReturnValue({ redisUrl: 'redis://test' });
    (createQueueClients as jest.Mock).mockReturnValue([]);
    process.env.WORKER_HEARTBEAT_REQUIRED = 'true';

    const service = new HealthService();
    const redis = redisInstances[0];
    if (!redis) {
      throw new Error('Redis instance was not created.');
    }
    redis.get.mockResolvedValueOnce(null);

    await expect(service.checkWorkerHeartbeat()).resolves.toEqual({
      ok: false,
      detail: 'Worker heartbeat missing',
    });
  });

  it('reports heartbeat ok when timestamp is fresh', async () => {
    (getConfig as jest.Mock).mockReturnValue({ redisUrl: 'redis://test' });
    (createQueueClients as jest.Mock).mockReturnValue([]);

    process.env.WORKER_HEARTBEAT_REQUIRED = 'true';
    process.env.WORKER_HEARTBEAT_TTL_SECONDS = '60';
    const service = new HealthService();
    const redis = redisInstances[0];
    if (!redis) {
      throw new Error('Redis instance was not created.');
    }
    redis.get.mockResolvedValueOnce(
      JSON.stringify({ timestamp: new Date().toISOString() }),
    );

    await expect(service.checkWorkerHeartbeat()).resolves.toEqual({ ok: true });
  });

  it('skips heartbeat check when not required', async () => {
    (getConfig as jest.Mock).mockReturnValue({ redisUrl: 'redis://test' });
    (createQueueClients as jest.Mock).mockReturnValue([]);

    process.env.WORKER_HEARTBEAT_REQUIRED = 'false';
    const service = new HealthService();

    await expect(service.checkWorkerHeartbeat()).resolves.toEqual({
      ok: true,
      detail: 'Worker heartbeat check skipped',
    });
  });

  it('marks readiness not-ready when checks fail', async () => {
    (getConfig as jest.Mock).mockReturnValue({ redisUrl: undefined });
    const service = new HealthService();

    const readiness = await service.getReadiness();
    expect(readiness.status).toBe('not-ready');
    expect(readiness.checks.redis.ok).toBe(false);
  });
});
