import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';
import { MetricsController } from '../src/metrics/metrics.controller';
import { MetricsService } from '../src/metrics/metrics.service';

describe('API endpoints', () => {
  let app: INestApplication;
  const healthService = {
    getHealth: jest.fn(),
    getReadiness: jest.fn(),
    getLiveness: jest.fn(),
  };
  const metricsService = {
    getMetrics: jest.fn(),
    getContentType: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController, MetricsController],
      providers: [
        { provide: HealthService, useValue: healthService },
        { provide: MetricsService, useValue: metricsService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.resetAllMocks();
  });

  it('GET /health returns status', async () => {
    healthService.getHealth.mockReturnValue({ status: 'ok' });

    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /ready returns ready status', async () => {
    healthService.getReadiness.mockResolvedValue({ status: 'ready' });

    await request(app.getHttpServer())
      .get('/ready')
      .expect(200)
      .expect({ status: 'ready' });
  });

  it('GET /ready returns 503 when not ready', async () => {
    healthService.getReadiness.mockResolvedValue({ status: 'not-ready' });

    const response = await request(app.getHttpServer())
      .get('/ready')
      .expect(503);

    expect(response.body.status).toBe(503);
  });

  it('GET /metrics returns metrics payload', async () => {
    metricsService.getMetrics.mockResolvedValue('metrics');
    metricsService.getContentType.mockReturnValue('text/plain');

    await request(app.getHttpServer())
      .get('/metrics')
      .expect(200)
      .expect('Content-Type', /text\/plain/)
      .expect('metrics');
  });
});
