'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Plus, RefreshCcw, X } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeletons';
import { apiFetch } from '@/lib/api';
import { hasPermission } from '@/lib/permissions';
import { usePermissions } from '@/lib/use-permissions';

interface ConnectionItem {
  id: string;
  sessionId: string;
  phoneNumber?: string | null;
  status: string;
  qrCode?: string | null;
  lastConnectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  CONNECTED: 'Conectado',
  DISCONNECTED: 'Desconectado',
  RECONNECTING: 'Reconectando',
  WAITING_QR: 'Aguardando QR',
};

const STATUS_STYLES: Record<string, string> = {
  CONNECTED: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  DISCONNECTED: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  RECONNECTING: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  WAITING_QR: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
};

export default function ConnectionsPage() {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrSession, setQrSession] = useState<ConnectionItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const canViewConnections = hasPermission(permissions, 'connections:view');
  const canCreateConnections = hasPermission(permissions, 'connections:create');
  const canViewQr = hasPermission(permissions, 'connections:qr');
  const canDisconnect = hasPermission(permissions, 'connections:disconnect');

  const loadConnections = useCallback(async () => {
    if (!canViewConnections) {
      setConnections([]);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<ConnectionItem[]>('/connections');
      setConnections(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao buscar conexoes';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [canViewConnections]);

  const fetchQr = useCallback(async (id: string) => {
    try {
      const data = await apiFetch<{ qrCode?: string | null; status: string }>(
        `/connections/${id}/qr`,
      );
      if (data.qrCode) {
        const url = await QRCode.toDataURL(data.qrCode, { margin: 1, width: 280 });
        setQrDataUrl(url);
      } else {
        setQrDataUrl(null);
      }
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar QR code';
      setError(message);
      return null;
    }
  }, []);

  useEffect(() => {
    if (permissionsLoading) {
      return;
    }
    void loadConnections();
    const interval = setInterval(() => {
      void loadConnections();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadConnections, permissionsLoading]);

  useEffect(() => {
    if (!qrOpen || !qrSession) return;
    void fetchQr(qrSession.id);
    const interval = setInterval(() => {
      void fetchQr(qrSession.id);
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchQr, qrOpen, qrSession]);

  const handleCreate = async () => {
    if (!canCreateConnections) {
      setError('Sem permissao para criar conexao.');
      return;
    }
    setLoading(true);
    try {
      const created = await apiFetch<ConnectionItem>('/connections', { method: 'POST' });
      setConnections((prev) => [created, ...prev]);
      setQrSession(created);
      setQrOpen(true);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao criar conexao';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (connection: ConnectionItem) => {
    if (!canDisconnect) {
      setError('Sem permissao para desconectar.');
      return;
    }
    setLoading(true);
    try {
      const updated = await apiFetch<ConnectionItem>(`/connections/${connection.id}`, {
        method: 'DELETE',
      });
      setConnections((prev) =>
        prev.map((item) => (item.id === connection.id ? updated : item)),
      );
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao desconectar';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (connection: ConnectionItem) => {
    if (!canDisconnect) {
      setError('Sem permissao para excluir conexao.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`/connections/${connection.id}/remove`, { method: 'DELETE' });
      setConnections((prev) => prev.filter((item) => item.id !== connection.id));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao excluir conexao';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const sortedConnections = useMemo(() => {
    return [...connections].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [connections]);

  return (
    <PageShell title="Conexoes" subtitle="WhatsApp">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>WhatsApp Connections</CardTitle>
            <CardDescription>
              Gerencie numeros conectados e acompanhe o status em tempo real.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={loadConnections}>
              <RefreshCcw size={16} className="mr-2" />
              Atualizar
            </Button>
            {canCreateConnections && (
              <Button size="sm" onClick={handleCreate}>
                <Plus size={16} className="mr-2" />
                Nova conexao
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}
          {loading ? (
            <SkeletonList rows={4} />
          ) : !canViewConnections ? (
            <EmptyState
              title="Sem permissao"
              description="Voce nao possui permissao para ver conexoes."
            />
          ) : sortedConnections.length === 0 ? (
            <EmptyState
              title="Nenhuma conexao ativa"
              description="Crie uma nova conexao para gerar o QR code de pareamento."
            />
          ) : (
            <div className="space-y-3">
              {sortedConnections.map((connection) => {
                const statusLabel = STATUS_LABELS[connection.status] ?? connection.status;
                const statusStyle = STATUS_STYLES[connection.status] ?? 'bg-muted text-foreground';
                return (
                  <div
                    key={connection.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/70 px-4 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {connection.phoneNumber || 'Numero aguardando conexao'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sessao {connection.sessionId.slice(0, 8)} • Criado em{' '}
                        {new Date(connection.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle}`}
                      >
                        {statusLabel}
                      </span>
                      {canViewQr && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setQrSession(connection);
                            setQrOpen(true);
                          }}
                        >
                          Ver QR
                        </Button>
                      )}
                      {canDisconnect && connection.status !== 'DISCONNECTED' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDisconnect(connection)}
                        >
                          Desconectar
                        </Button>
                      )}
                      {canDisconnect && connection.status === 'DISCONNECTED' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRemove(connection)}
                        >
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {qrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur"
            onClick={() => {
              setQrOpen(false);
              setQrDataUrl(null);
            }}
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-border/60 bg-card/95 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Conexao WhatsApp
                </p>
                <h3 className="mt-2 text-xl font-semibold">Escaneie o QR code</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Abra o WhatsApp Business e escaneie o QR para finalizar o pareamento.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQrOpen(false);
                  setQrDataUrl(null);
                }}
              >
                <X size={16} />
              </Button>
            </div>
            <div className="mt-6 flex flex-col items-center gap-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR code para conectar WhatsApp"
                  className="h-64 w-64 rounded-2xl border border-border/60 bg-white p-4"
                />
              ) : (
                <div className="flex h-64 w-64 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/40 text-sm text-muted-foreground">
                  Aguardando QR code...
                </div>
              )}
              {qrSession && (
                <p className="text-xs text-muted-foreground">
                  Sessao: {qrSession.sessionId}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
