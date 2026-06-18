interface AttendanceAuditMessageSample {
  id: string;
  at: Date | string;
  from: "agent" | "customer";
  body: string;
  mediaType: string | null;
}

interface AttendanceAuditTicket {
  ticketId: number;
  status: string;
  contact?: {
    id: number;
    name: string;
    number?: string;
  } | null;
  queue?: {
    id: number;
    name: string;
    color?: string;
  } | null;
  whatsapp?: {
    id: number;
    name: string;
  } | null;
  assignee?: {
    id: number;
    name: string;
  } | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  firstCustomerMessageAt?: Date | string | null;
  firstAgentMessageAt?: Date | string | null;
  firstResponseSeconds?: number | null;
  customerMessages: number;
  agentMessages: number;
  internalMessages: number;
  mediaMessages: number;
  audioMessages: number;
  lastMessageAt?: Date | string | null;
  lastMessageFrom?: "agent" | "customer" | null;
  longestAgentSilenceSeconds?: number | null;
  messagesSample: AttendanceAuditMessageSample[];
}

interface AttendanceAuditDossier {
  requested: any;
  summary: any;
  tickets: AttendanceAuditTicket[];
}

const MAX_TICKETS_IN_PROMPT = 20;
const MAX_MESSAGES_PER_TICKET = 8;
const MAX_MESSAGE_CHARS = 320;

const truncateText = (value: string, maxLength: number): string => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
};

const formatSeconds = (seconds?: number | null): string => {
  if (seconds === null || seconds === undefined) {
    return "sem dado";
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.round(seconds / 60);
  return `${minutes}min`;
};

const formatTicketForPrompt = (ticket: AttendanceAuditTicket): string => {
  const messages = Array.isArray(ticket.messagesSample)
    ? ticket.messagesSample.slice(-MAX_MESSAGES_PER_TICKET)
    : [];

  const formattedMessages = messages.length
    ? messages
        .map(message => {
          const author = message.from === "agent" ? "atendente" : "cliente";
          const body = truncateText(message.body || `[midia: ${message.mediaType || "sem tipo"}]`, MAX_MESSAGE_CHARS);

          return `      - ${author} em ${message.at}: ${body}`;
        })
        .join("\n")
    : "      - sem amostra de mensagens";

  return [
    `Ticket #${ticket.ticketId}`,
    `  status: ${ticket.status}`,
    `  contato: ${ticket.contact?.name || "sem nome"}`,
    `  fila: ${ticket.queue?.name || "sem fila"}`,
    `  conexao: ${ticket.whatsapp?.name || "sem conexao"}`,
    `  responsavel: ${ticket.assignee?.name || "sem responsavel"}`,
    `  criado em: ${ticket.createdAt}`,
    `  atualizado em: ${ticket.updatedAt}`,
    `  primeira mensagem cliente: ${ticket.firstCustomerMessageAt || "sem dado"}`,
    `  primeira resposta atendente: ${ticket.firstAgentMessageAt || "sem dado"}`,
    `  tempo primeira resposta: ${formatSeconds(ticket.firstResponseSeconds)}`,
    `  maior intervalo cliente->atendente: ${formatSeconds(ticket.longestAgentSilenceSeconds)}`,
    `  mensagens cliente: ${ticket.customerMessages}`,
    `  mensagens atendente: ${ticket.agentMessages}`,
    `  mensagens internas: ${ticket.internalMessages}`,
    `  midias: ${ticket.mediaMessages}`,
    `  audios: ${ticket.audioMessages}`,
    `  ultima mensagem: ${ticket.lastMessageAt || "sem dado"} (${ticket.lastMessageFrom || "sem origem"})`,
    "  amostra recente:",
    formattedMessages
  ].join("\n");
};

const BuildAttendanceAuditReportPromptService = (
  dossier: AttendanceAuditDossier
): string => {
  const tickets = Array.isArray(dossier.tickets) ? dossier.tickets : [];
  const ticketsForPrompt = tickets.slice(0, MAX_TICKETS_IN_PROMPT);

  const formattedTickets = ticketsForPrompt.length
    ? ticketsForPrompt.map(formatTicketForPrompt).join("\n\n")
    : "Nenhum ticket encontrado no periodo/filtro informado.";

  return [
    "Voce e um auditor senior de atendimento comercial no WhatsApp.",
    "Analise o dossie abaixo e gere um relatorio objetivo para gestor comercial.",
    "",
    "Regras obrigatorias:",
    "- Responda em portugues do Brasil.",
    "- Nao invente dados que nao aparecem no dossie.",
    "- Nao exponha numero de telefone, documento, token, dado sensivel ou informacao que nao seja necessaria.",
    "- Se houver poucos dados, diga claramente que a amostra e insuficiente.",
    "- Use ticketId quando precisar citar exemplos.",
    "- Foque em atendimento humano: tempo de resposta, clareza, personalizacao, excesso de perguntas, follow-up, abandono, oportunidade perdida e qualidade da conducao.",
    "- Nao recomende alteracao tecnica no sistema; recomende melhoria operacional de atendimento.",
    "",
    "Formato obrigatorio do relatorio:",
    "1. Resumo executivo",
    "2. Pontos positivos do atendimento",
    "3. Pontos de atencao",
    "4. Possiveis motivos de perda ou silencio do cliente",
    "5. Tickets que merecem revisao manual",
    "6. Recomendacoes praticas para o atendente",
    "7. Plano de acao para o gestor",
    "",
    "Resumo numerico do dossie:",
    JSON.stringify(dossier.summary, null, 2),
    "",
    "Filtros solicitados:",
    JSON.stringify(dossier.requested, null, 2),
    "",
    `Tickets incluidos no prompt: ${ticketsForPrompt.length} de ${tickets.length}`,
    "",
    "Dossie dos tickets:",
    formattedTickets
  ].join("\n");
};

export default BuildAttendanceAuditReportPromptService;
