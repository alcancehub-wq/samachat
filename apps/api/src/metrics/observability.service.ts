import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type IORedis from 'ioredis';
import { getConfig } from '@samachat/config';
import { getLogger } from '@samachat/logger';
import { CONNECTIONS_REDIS } from '../modules/connections/session.store';
import { MetricsService } from './metrics.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConnectionStatus } from '@prisma/client';

interface EventEnvelope {
  event?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class ObservabilityService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = getLogger({ service: 'api', component: 'observability' });
  private subscriber?: IORedis;
  private readonly statusCounts = new Map<string, number>();
  private readonly sessionStatuses = new Map<string, string>();
  private readonly failureTimestamps: number[] = [];

  constructor(
    @Inject(CONNECTIONS_REDIS) private readonly redis: IORedis,
    private readonly metrics: MetricsService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.loadConnectionCounts();

    this.subscriber = this.redis.duplicate();
    await this.subscriber.subscribe('samachat.events');

    this.subscriber.on('message', (_channel, rawMessage) => {
      void this.handleEvent(rawMessage);
    });

    this.subscriber.on('error', (error) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn({ error: message }, 'Redis subscriber error');
      void this.sendAlert('redis_disconnected', { error: message });
    });
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.unsubscribe('samachat.events');
      await this.subscriber.quit();
    }
  }

  private async handleEvent(rawMessage: string) {
    let envelope: EventEnvelope;
    try {
      envelope = JSON.parse(rawMessage) as EventEnvelope;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn({ error: message }, 'Failed to parse event');
      this.metrics.incrementEventsFailed();
      return;
    }

    this.metrics.incrementEventsProcessed();

    const event = envelope.event;
    const payload = envelope.payload ?? {};

    if (event === 'message_received') {
      this.metrics.incrementMessagesReceived();
    }

    if (event === 'message_sent') {
      this.metrics.incrementMessagesSent();
    }

    if (event === 'automation_executed') {
      this.metrics.incrementAutomationExecutions();
    }

    if (event === 'automation_failed') {
      this.metrics.incrementEventsFailed();
    }

    if (event === 'connection_status') {
      const status = String(payload.status ?? 'unknown');
      const sessionId = payload.session_id;
      if (typeof sessionId === 'string') {
        this.applyConnectionStatus(sessionId, status);
      }
      if (status === ConnectionStatus.DISCONNECTED) {
        void this.sendAlert('connection_lost', payload);
      }
    }

    if (event === 'connection_reconnect') {
      this.metrics.incrementReconnectEvents();
    }

    if (event === 'message_failed') {
      this.trackMessageFailure();
      this.metrics.incrementEventsFailed();
    }
  }

  private async loadConnectionCounts() {
    const grouped = await this.prisma.whatsappSession.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const sessions = await this.prisma.whatsappSession.findMany({
      select: { session_id: true, status: true },
    });
    for (const session of sessions) {
      this.sessionStatuses.set(session.session_id, session.status);
    }

    const knownStatuses = Object.values(ConnectionStatus);
    for (const status of knownStatuses) {
      const count = grouped.find((item) => item.status === status)?._count._all ?? 0;
      this.statusCounts.set(status, count);
      this.metrics.setConnectionStatusCount(status, count);
    }
  }

  private applyConnectionStatus(sessionId: string, status: string) {
    const previous = this.sessionStatuses.get(sessionId);
    if (previous) {
      const prevCount = this.statusCounts.get(previous) ?? 0;
      this.statusCounts.set(previous, Math.max(prevCount - 1, 0));
    }

    this.sessionStatuses.set(sessionId, status);
    const nextCount = (this.statusCounts.get(status) ?? 0) + 1;
    this.statusCounts.set(status, nextCount);

    for (const [key, value] of this.statusCounts.entries()) {
      this.metrics.setConnectionStatusCount(key, value);
    }
  }

  private trackMessageFailure() {
    const now = Date.now();
    const config = getConfig();
    const windowMs = config.alerts.messageFailureWindowSeconds * 1000;

    this.failureTimestamps.push(now);
    while (this.failureTimestamps.length > 0) {
      const oldest = this.failureTimestamps[0];
      if (oldest === undefined || oldest >= now - windowMs) {
        break;
      }
      this.failureTimestamps.shift();
    }

    if (this.failureTimestamps.length >= config.alerts.messageFailureThreshold) {
      void this.sendAlert('message_failures_spike', {
        count: this.failureTimestamps.length,
        windowSeconds: config.alerts.messageFailureWindowSeconds,
      });
    }
  }

  private async sendAlert(event: string, payload: Record<string, unknown>) {
    const { alerts } = getConfig();
    if (!alerts.webhookUrl) {
      return;
    }

    try {
      await fetch(alerts.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn({ error: message }, 'Failed to send alert webhook');
    }
  }
}
