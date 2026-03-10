'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, SendHorizontal } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const conversations = [
  {
    id: 'conv-1',
    name: 'Amanda Souza',
    preview: 'Preciso de ajuda com a campanha.',
    time: '09:42',
    unread: 2,
  },
  {
    id: 'conv-2',
    name: 'Lucas Pereira',
    preview: 'Obrigado pela atualizacao!',
    time: '09:10',
    unread: 0,
  },
  {
    id: 'conv-3',
    name: 'Equipe Financeiro',
    preview: 'Podemos revisar os fluxos hoje?',
    time: '08:55',
    unread: 1,
  },
];

const messagesByConversation: Record<string, { id: string; from: 'me' | 'them'; text: string }[]> = {
  'conv-1': [
    { id: 'm1', from: 'them', text: 'Oi, preciso de ajuda com a campanha premium.' },
    { id: 'm2', from: 'me', text: 'Claro! Me passe o link do fluxo e reviso agora.' },
    { id: 'm3', from: 'them', text: 'Enviei no drive interno, consegue ver?' },
  ],
  'conv-2': [
    { id: 'm4', from: 'them', text: 'Obrigado pela atualizacao!' },
    { id: 'm5', from: 'me', text: 'Imagina! Se precisar de algo, me avise.' },
  ],
  'conv-3': [
    { id: 'm6', from: 'them', text: 'Podemos revisar os fluxos hoje?' },
    { id: 'm7', from: 'me', text: 'Sim, depois das 14h fica perfeito.' },
  ],
};

export default function InboxPage() {
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null);
  const [showChat, setShowChat] = useState(false);

  const activeMessages = useMemo(() => {
    if (!activeId) {
      return [];
    }
    return messagesByConversation[activeId] ?? [];
  }, [activeId]);

  const openConversation = (id: string) => {
    setActiveId(id);
    setShowChat(true);
  };

  const activeConversation = conversations.find((conversation) => conversation.id === activeId);

  return (
    <PageShell title="Conversas" subtitle="Inbox">
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
              <p className="text-xs text-muted-foreground">{conversations.length} conversas</p>
            </div>
            <Button size="sm" variant="secondary">
              Novo
            </Button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => openConversation(conversation.id)}
                className={cn(
                  'w-full rounded-xl border border-border/60 px-4 py-3 text-left transition',
                  activeId === conversation.id ? 'bg-muted/60' : 'hover:bg-muted/40',
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{conversation.name}</p>
                  <span className="text-xs text-muted-foreground">{conversation.time}</span>
                </div>
                <p className="mt-2 truncate text-xs text-muted-foreground">{conversation.preview}</p>
                {conversation.unread > 0 && (
                  <span className="mt-2 inline-flex rounded-full bg-primary/20 px-2 py-0.5 text-[0.65rem] text-primary">
                    {conversation.unread} novas
                  </span>
                )}
              </button>
            ))}
          </div>
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
              <h2 className="text-sm font-semibold">{activeConversation?.name ?? 'Selecione uma conversa'}</h2>
              <p className="text-xs text-muted-foreground">Atendimento ativo</p>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {activeMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                  message.from === 'me'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-foreground',
                )}
              >
                {message.text}
              </div>
            ))}
          </div>
          <form className="mt-4 flex items-center gap-2">
            <input
              className="flex-1 rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
              placeholder="Digite sua mensagem"
            />
            <Button type="submit" size="sm" className="h-11 w-11 p-0" aria-label="Enviar">
              <SendHorizontal size={16} />
            </Button>
          </form>
        </section>
      </div>
    </PageShell>
  );
}
