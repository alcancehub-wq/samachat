"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const health_service_1 = require("../health.service");
const config_1 = require("@samachat/config");
const queues_1 = require("../../observability/queues");
const ioredis_1 = __importDefault(require("ioredis"));
jest.mock('@samachat/config', () => ({
    getConfig: jest.fn(),
}));
jest.mock('../../observability/queues', () => ({
    createQueueClients: jest.fn(),
}));
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        ping: jest.fn(),
        get: jest.fn(),
    }));
});
describe('HealthService', () => {
    const originalEnv = process.env;
    beforeEach(() => {
        jest.resetAllMocks();
        process.env = { ...originalEnv };
    });
    afterAll(() => {
        process.env = originalEnv;
    });
    it('reports missing redis when redisUrl is unset', async () => {
        config_1.getConfig.mockReturnValue({ redisUrl: undefined });
        const service = new health_service_1.HealthService();
        await expect(service.checkRedis()).resolves.toEqual({
            ok: false,
            detail: 'REDIS_URL not set',
        });
    });
    it('reports redis ok when ping succeeds', async () => {
        config_1.getConfig.mockReturnValue({ redisUrl: 'redis://test' });
        queues_1.createQueueClients.mockReturnValue([]);
        const service = new health_service_1.HealthService();
        const redis = ioredis_1.default.mock.instances[0];
        redis.ping.mockResolvedValueOnce('PONG');
        await expect(service.checkRedis()).resolves.toEqual({ ok: true });
    });
    it('reports redis errors when ping fails', async () => {
        config_1.getConfig.mockReturnValue({ redisUrl: 'redis://test' });
        queues_1.createQueueClients.mockReturnValue([]);
        const service = new health_service_1.HealthService();
        const redis = ioredis_1.default.mock.instances[0];
        redis.ping.mockRejectedValueOnce(new Error('boom'));
        await expect(service.checkRedis()).resolves.toEqual({
            ok: false,
            detail: 'boom',
        });
    });
    it('reports queues not initialized when empty', async () => {
        config_1.getConfig.mockReturnValue({ redisUrl: 'redis://test' });
        queues_1.createQueueClients.mockReturnValue([]);
        const service = new health_service_1.HealthService();
        await expect(service.checkQueues()).resolves.toEqual({
            ok: false,
            detail: 'Queues not initialized',
        });
    });
    it('reports queues ok when queue checks succeed', async () => {
        config_1.getConfig.mockReturnValue({ redisUrl: 'redis://test' });
        const queue = { getJobCounts: jest.fn().mockResolvedValue({}) };
        queues_1.createQueueClients.mockReturnValue([queue]);
        const service = new health_service_1.HealthService();
        await expect(service.checkQueues()).resolves.toEqual({ ok: true });
        expect(queue.getJobCounts).toHaveBeenCalledWith('waiting');
    });
    it('reports heartbeat missing when no payload', async () => {
        config_1.getConfig.mockReturnValue({ redisUrl: 'redis://test' });
        queues_1.createQueueClients.mockReturnValue([]);
        const service = new health_service_1.HealthService();
        const redis = ioredis_1.default.mock.instances[0];
        redis.get.mockResolvedValueOnce(null);
        await expect(service.checkWorkerHeartbeat()).resolves.toEqual({
            ok: false,
            detail: 'Worker heartbeat missing',
        });
    });
    it('reports heartbeat ok when timestamp is fresh', async () => {
        config_1.getConfig.mockReturnValue({ redisUrl: 'redis://test' });
        queues_1.createQueueClients.mockReturnValue([]);
        process.env.WORKER_HEARTBEAT_TTL_SECONDS = '60';
        const service = new health_service_1.HealthService();
        const redis = ioredis_1.default.mock.instances[0];
        redis.get.mockResolvedValueOnce(JSON.stringify({ timestamp: new Date().toISOString() }));
        await expect(service.checkWorkerHeartbeat()).resolves.toEqual({ ok: true });
    });
    it('marks readiness not-ready when checks fail', async () => {
        config_1.getConfig.mockReturnValue({ redisUrl: undefined });
        const service = new health_service_1.HealthService();
        const readiness = await service.getReadiness();
        expect(readiness.status).toBe('not-ready');
        expect(readiness.checks.redis.ok).toBe(false);
    });
});
