'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Paperclip, RefreshCcw, SendHorizontal, Sparkles } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeletons';
import { apiFetch } from '@/lib/api';
import { getPublicConfig } from '@/lib/public-config';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { getTenantId } from '@/lib/tenant';

interface ConversationItem {
  conversation_id: string;
  contact_name: string | null;
  phone_number: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface MessageItem {
  message_id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  content: string | null;
  type?: string;
  media_url?: string | null;
  media_mime?: string | null;
  media_size?: number | null;
  timestamp: string;
  status: string;
}

interface MessageListResponse {
  items: MessageItem[];
  next_cursor: string | null;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<
    { url: string; mime: string; size: number; type: string } | null
  >(null);
  const [showChat, setShowChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crmStatus, setCrmStatus] = useState<string | null>(null);
  const [crmResult, setCrmResult] = useState<
    { contact_id: string; deal_id: string; pipeline_id: string; already_linked?: boolean } | null
  >(null);
  const socketRef = useRef<Socket | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await apiFetch<ConversationItem[]>('/conversations');
      setConversations(data);
      if (!activeId && data.length > 0) {
        const first = data[0];
        if (first) {
          setActiveId(first.conversation_id);
        }
      }
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar conversas';
      setError(message);
    } finally {
      setLoadingConversations(false);
    }
  }, [activeId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const response = await apiFetch<MessageListResponse>(
        `/conversations/${conversationId}/messages?limit=200`,
      );
      setMessages(response.items);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar mensagens';
      setError(message);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) {
      void loadMessages(activeId);
      setCrmResult(null);
      setCrmStatus(null);
    }
  }, [activeId, loadMessages]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const setupSocket = useCallback(() => {
    const config = getPublicConfig();
    const socket = io(config.apiUrl, { transports: ['websocket'] });

    socket.on('message_received', (payload: Record<string, unknown>) => {
      const conversationId = payload.conversation_id as string | undefined;
      if (!conversationId) {
        return;
      }

      if (conversationId === activeIdRef.current) {
        setMessages((prev) => [
          ...prev,
          {
            message_id: String(payload.message_id),
            direction: payload.direction as 'INBOUND' | 'OUTBOUND',
            content: payload.content as string | null,
            type: payload.type as string | undefined,
            media_url: payload.media_url as string | null,
            media_mime: payload.media_mime as string | null,
            media_size: payload.media_size as number | null,
            timestamp: String(payload.timestamp),
            status: 'DELIVERED',
          },
        ]);
      }

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.conversation_id === conversationId
            ? {
                ...conversation,
                last_message:
                  (payload.content as string) ??
                  (payload.type ? `[${payload.type}]` : conversation.last_message),
                last_message_at: String(payload.timestamp),
                unread_count:
                  conversationId === activeIdRef.current
                    ? conversation.unread_count
                    : conversation.unread_count + 1,
              }
            : conversation,
        ),
      );
    });

    socket.on('message_sent', (payload: Record<string, unknown>) => {
      const conversationId = payload.conversation_id as string | undefined;
      if (!conversationId) {
        return;
      }

      if (conversationId === activeIdRef.current) {
        setMessages((prev) => [
          ...prev,
          {
            message_id: String(payload.message_id),
            direction: payload.direction as 'INBOUND' | 'OUTBOUND',
            content: payload.content as string | null,
            type: payload.type as string | undefined,
            media_url: payload.media_url as string | null,
            media_mime: payload.media_mime as string | null,
            media_size: payload.media_size as number | null,
            timestamp: String(payload.timestamp),
            status: 'SENT',
          },
        ]);
      }

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.conversation_id === conversationId
            ? {
                ...conversation,
                last_message:
                  (payload.content as string) ??
                  (payload.type ? `[${payload.type}]` : conversation.last_message),
                last_message_at: String(payload.timestamp),
              }
            : conversation,
        ),
      );
    });

    socket.on('conversation_updated', () => {
      void loadConversations();
    });

    socketRef.current = socket;
  }, [loadConversations]);

  useEffect(() => {
    setupSocket();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [setupSocket]);

  const activeConversation = useMemo(() => {
    return conversations.find((conversation) => conversation.conversation_id === activeId);
  }, [activeId, conversations]);

  const openConversation = (conversationId: string) => {
    setActiveId(conversationId);
    setShowChat(true);
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.conversation_id === conversationId
          ? { ...conversation, unread_count: 0 }
          : conversation,
      ),
    );
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeId) {
      return;
    }

    const hasMedia = Boolean(uploadedMedia);
    const textPayload = composerText.trim();
    if (!hasMedia && textPayload.length === 0) {
      return;
    }

    setComposerText('');

    try {
      await apiFetch('/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: activeId,
          content: textPayload.length > 0 ? textPayload : undefined,
          type: uploadedMedia?.type ?? 'text',
          media_url: uploadedMedia?.url ?? undefined,
          media_mime: uploadedMedia?.mime ?? undefined,
          media_size: uploadedMedia?.size ?? undefined,
        }),
      });
      setUploadedMedia(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao enviar mensagem';
      setError(message);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const config = getPublicConfig();
    const maxBytes = config.maxUploadMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`Arquivo excede ${config.maxUploadMb} MB.`);
      event.target.value = '';
      return;
    }

    const typeMap: Record<string, string> = {
      'image/jpeg': 'image',
      'image/png': 'image',
      'video/mp4': 'video',
      'audio/mpeg': 'audio',
      'application/pdf': 'document',
    };

    const mediaType = typeMap[file.type];
    if (!mediaType) {
      setError('Formato de arquivo nao suportado.');
      event.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const token = (await supabase.auth.getSession()).data.session?.access_token ?? null;
      const tenantId = getTenantId();

      const formData = new FormData();
      formData.append('file', file);

      const headers = new Headers();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (tenantId) headers.set('x-tenant-id', tenantId);

      const response = await fetch(`${config.apiUrl}/messages/upload`, {
        method: 'POST',
        body: formData,
        headers,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Falha ao enviar arquivo');
      }

      const payload = (await response.json()) as { url: string; mime: string; size: number };
      setUploadedMedia({
        url: payload.url,
        mime: payload.mime,
        size: payload.size,
        type: mediaType,
      });
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao enviar arquivo';
      setError(message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleCreateLead = async () => {
    if (!activeId) {
      return;
    }
    setCrmStatus('Criando lead no CRM...');
    try {
      const result = await apiFetch<{ contact_id: string; deal_id: string; pipeline_id: string; already_linked?: boolean }>(
        '/crm/create-lead',
        {
          method: 'POST',
          body: JSON.stringify({ conversation_id: activeId }),
        },
      );
      setCrmResult(result);
      setCrmStatus(result.already_linked ? 'Ja existe no CRM' : 'Lead criado no CRM');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao criar lead no CRM';
      setCrmStatus(message);
    }
  };

  return (
    <PageShell title="Inbox" subtitle="Conversas">
      <div className="grid min-h-[70vh] gap-6 lg:grid-cols-[320px_1fr] lg:gap-8">
        <section
          className={cn(
            'flex flex-col rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur',
            showChat ? 'hidden lg:flex' : 'flex',
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Inbox</h2>
              <p className="text-xs text-muted-foreground">
                {conversations.length} conversas
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={loadConversations}>
              <RefreshCcw size={14} className="mr-2" />
              Atualizar
            </Button>
          </div>
          {loadingConversations ? (
            <SkeletonList rows={6} />
          ) : conversations.length === 0 ? (
            <EmptyState
              title="Nenhuma conversa"
              description="Assim que novas mensagens chegarem, elas aparecerao aqui."
            />
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {conversations.map((conversation) => (
                <button
                  key={conversation.conversation_id}
                  type="button"
                  onClick={() => openConversation(conversation.conversation_id)}
                  className={cn(
                    'w-full rounded-xl border border-border/60 px-4 py-3 text-left transition',
                    activeId === conversation.conversation_id
                      ? 'bg-muted/60'
                      : 'hover:bg-muted/40',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {conversation.contact_name || conversation.phone_number}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {conversation.last_message_at
                        ? new Date(conversation.last_message_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '--'}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-xs text-muted-foreground">
                    {conversation.last_message || 'Sem mensagens ainda.'}
                  </p>
                  {conversation.unread_count > 0 && (
                    <span className="mt-2 inline-flex rounded-full bg-primary/20 px-2 py-0.5 text-[0.65rem] text-primary">
                      {conversation.unread_count} novas
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <section
          className={cn(
            'flex flex-col rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur',
            showChat ? 'flex' : 'hidden lg:flex',
          )}
        >
          <div className="mb-4 flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowChat(false)}
              aria-label="Voltar para inbox"
            >
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h2 className="text-sm font-semibold">
                {activeConversation?.contact_name ||
                  activeConversation?.phone_number ||
                  'Selecione uma conversa'}
              </h2>
              <p className="text-xs text-muted-foreground">Atendimento ativo</p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleCreateLead}>
              <Sparkles size={14} className="mr-2" />
              Create in CRM
            </Button>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}
          {crmStatus && (
            <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs text-foreground">
              <p className="font-semibold">{crmStatus}</p>
              {crmResult && (
                <div className="mt-2 space-y-1 text-[0.7rem] text-muted-foreground">
                  <p>Contact ID: {crmResult.contact_id}</p>
                  <p>Deal ID: {crmResult.deal_id}</p>
                  <p>Pipeline ID: {crmResult.pipeline_id}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {loadingMessages ? (
              <SkeletonList rows={6} />
            ) : messages.length === 0 ? (
              <EmptyState
                title="Sem mensagens"
                description="Envie a primeira mensagem para iniciar o atendimento."
              />
            ) : (
              messages.map((message) => {
                const isOutbound = message.direction === 'OUTBOUND';
                return (
                  <div
                    key={message.message_id}
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                      isOutbound
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'bg-muted/60 text-foreground',
                    )}
                  >
                    {renderMessageContent(message)}
                    <div
                      className={cn(
                        'mt-2 flex items-center justify-end gap-2 text-[0.65rem]',
                        isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground',
                      )}
                    >
                      <span>
                        {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>{message.status}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form className="mt-4 flex items-center gap-2" onSubmit={handleSend}>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,video/mp4,audio/mpeg,application/pdf"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-11 w-11 p-0"
              aria-label="Enviar arquivo"
              onClick={handleFileClick}
              disabled={uploading}
            >
              <Paperclip size={16} />
            </Button>
            <input
              className="flex-1 rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
              placeholder="Digite sua mensagem"
              value={composerText}
              onChange={(event) => setComposerText(event.target.value)}
            />
            <Button type="submit" size="sm" className="h-11 w-11 p-0" aria-label="Enviar">
              <SendHorizontal size={16} />
            </Button>
          </form>
          {uploadedMedia && (
            <div className="mt-2 text-xs text-muted-foreground">
              Arquivo anexado: {uploadedMedia.mime} ({Math.round(uploadedMedia.size / 1024)} KB)
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function renderMessageContent(message: MessageItem) {
  const config = getPublicConfig();
  const mediaUrl = message.media_url
    ? message.media_url.startsWith('/')
      ? `${config.apiUrl}${message.media_url}`
      : message.media_url
    : null;

  if (message.type === 'image' && mediaUrl) {
    return <img src={mediaUrl} alt={message.content ?? 'Imagem'} className="rounded-xl" />;
  }

  if (message.type === 'video' && mediaUrl) {
    return (
      <video controls className="w-full rounded-xl">
        <source src={mediaUrl} />
      </video>
    );
  }

  if (message.type === 'audio' && mediaUrl) {
    return (
      <audio controls className="w-full">
        <source src={mediaUrl} />
      </audio>
    );
  }

  if (message.type === 'document' && mediaUrl) {
    return (
      <a
        href={mediaUrl}
        className="text-xs font-semibold underline"
        target="_blank"
        rel="noreferrer"
      >
        Baixar documento
      </a>
    );
  }

  if (message.type === 'sticker' && mediaUrl) {
    return <img src={mediaUrl} alt="Sticker" className="h-24 w-24" />;
  }

  return <p>{message.content}</p>;
}
