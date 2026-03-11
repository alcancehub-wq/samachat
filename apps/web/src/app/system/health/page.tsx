'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCcw } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { getPublicConfig } from '@/lib/public-config';

interface HealthResponse {
  status: string;
  checks: {
    redis: { ok: boolean; detail?: string };
    queues: { ok: boolean; detail?: string };
    workerHeartbeat: { ok: boolean; detail?: string };
  };
  connections?: Record<string, number>;
  workers?: Array<{
    workerId: string;
    connections: number;
    capacity: number;
    load: number;
    lastHeartbeat?: string;
  }>;
  timestamp: string;
}

interface MetricsSummary {
  messagesReceived: number;
  messagesSent: number;
  automationExecutions: number;
  eventsProcessed: number;
  eventsFailed: number;
  connections: Record<string, number>;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    const config = getPublicConfig();
    const response = await fetch(`${config.apiUrl}/metrics`);
    const text = await response.text();
    return parseMetrics(text);
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<HealthResponse>('/health');
      const metricsData = await fetchMetrics();
      setHealth(data);
      setMetrics(metricsData);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar saude';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchMetrics]);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  return (
    <PageShell title="Saude do sistema" subtitle="Observabilidade">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Status geral</CardTitle>
              <CardDescription>Monitoramento de API e conexoes.</CardDescription>
            </div>
            <Button variant="secondary" size="sm" onClick={loadHealth}>
              <RefreshCcw size={14} className="mr-2" />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {loading || !health ? (
              <p className="text-sm text-muted-foreground">Carregando status...</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <StatusCard label="API" value={health.status} />
                <StatusCard label="Redis" value={health.checks.redis.ok ? 'ok' : 'falha'} />
                <StatusCard
                  label="Worker"
                  value={health.checks.workerHeartbeat.ok ? 'ok' : 'falha'}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Mensagens</CardTitle>
              <CardDescription>Volume processado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <MetricRow label="Recebidas" value={metrics?.messagesReceived ?? 0} />
              <MetricRow label="Enviadas" value={metrics?.messagesSent ?? 0} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Automacoes</CardTitle>
              <CardDescription>Execucoes totais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <MetricRow label="Executadas" value={metrics?.automationExecutions ?? 0} />
              <MetricRow label="Eventos processados" value={metrics?.eventsProcessed ?? 0} />
              <MetricRow label="Eventos falhos" value={metrics?.eventsFailed ?? 0} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conexoes</CardTitle>
              <CardDescription>Status atual das sessoes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(Object.keys(metrics?.connections ?? {}).length > 0
                ? Object.entries(metrics?.connections ?? {})
                : Object.entries(health?.connections ?? {})
              ).map(([status, count]) => (
                <MetricRow key={status} label={status} value={count} />
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workers</CardTitle>
            <CardDescription>Distribuicao das conexoes por worker.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(health?.workers?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum worker ativo.</p>
            ) : (
              health?.workers?.map((worker) => (
                <div
                  key={worker.workerId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">{worker.workerId}</p>
                    <p className="text-xs text-muted-foreground">
                      Ultimo heartbeat: {worker.lastHeartbeat ?? 'desconhecido'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {worker.connections}/{worker.capacity} conexoes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Carga: {Math.round(worker.load * 100)}%
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity size={14} />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold uppercase tracking-wide">{value}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function parseMetrics(raw: string): MetricsSummary {
  const lines = raw.split('\n');
  const metrics: MetricsSummary = {
    messagesReceived: 0,
    messagesSent: 0,
    automationExecutions: 0,
    eventsProcessed: 0,
    eventsFailed: 0,
    connections: {},
  };

  for (const line of lines) {
    if (line.startsWith('samachat_messages_received_total')) {
      metrics.messagesReceived = readValue(line);
    }
    if (line.startsWith('samachat_messages_sent_total')) {
      metrics.messagesSent = readValue(line);
    }
    if (line.startsWith('samachat_automation_executions_total')) {
      metrics.automationExecutions = readValue(line);
    }
    if (line.startsWith('samachat_events_processed_total')) {
      metrics.eventsProcessed = readValue(line);
    }
    if (line.startsWith('samachat_events_failed_total')) {
      metrics.eventsFailed = readValue(line);
    }
    if (line.startsWith('samachat_active_connections')) {
      const statusMatch = /status="([^"]+)"/.exec(line);
      const status = statusMatch?.[1];
      if (status) {
        metrics.connections[status] = readValue(line);
      }
    }
  }

  return metrics;
}

function readValue(line: string) {
  const parts = line.split(' ');
  const value = Number(parts[parts.length - 1]);
  return Number.isFinite(value) ? value : 0;
}
