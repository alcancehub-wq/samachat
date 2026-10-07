export interface PolicySettings {
  isEnabled: boolean;
  // Quem atende primeiro uma conversa nova: true = a IA, false = a equipe.
  autoEnableForNewTickets: boolean;
  // Modo teste: so os numeros da lista sao atendidos pela IA; o resto do chat
  // segue exatamente como antes.
  testMode?: boolean;
  allowedNumbers?: string | null;
  systemPrompt?: string | null;
}

export interface PolicyTicket {
  isGroup: boolean;
  userId?: number | null; // atendente humano que assumiu
  sdrAgentEnabled?: boolean | null;
}

export type PolicyDecision =
  | { respond: true }
  | { respond: false; reason: string };

const digits = (value?: string | null): string =>
  String(value || "").replace(/\D/g, "");

const MIN_DIGITS = 8;

// So virgula, ponto e virgula e quebra de linha separam numeros (espaco faz
// parte do numero: "11 99999-8888"). Entradas curtas demais sao descartadas:
// um pedaco como "11" liberaria todo numero que termina assim.
export const parseAllowedNumbers = (raw?: string | null): string[] =>
  String(raw || "")
    .split(/[,;\r\n]+/)
    .map(digits)
    .filter(d => d.length >= MIN_DIGITS);

// O telefone esta na lista? Compara pelo final do numero, para aceitar com ou
// sem DDI/9o digito (ex.: 5511999998888 x 11999998888). Lista vazia = ninguem.
export const numberAllowed = (
  allowed: string[],
  contactNumber?: string | null
): boolean => {
  const n = digits(contactNumber);
  if (allowed.length === 0 || n.length < MIN_DIGITS) return false;
  return allowed.some(a => n.endsWith(a) || a.endsWith(n));
};

// Decide se o agente SDR deve responder a ESTA mensagem. Todas as travas de
// seguranca ficam aqui, num lugar so e sem tocar em banco: o padrao e NAO
// responder.
export const decideSdrReply = (input: {
  settings: PolicySettings;
  ticket: PolicyTicket;
  contactNumber?: string | null;
  fromMe: boolean;
  hasText: boolean;
}): PolicyDecision => {
  const { settings, ticket, contactNumber, fromMe, hasText } = input;

  if (!settings.isEnabled) return { respond: false, reason: "agente_desligado" };
  if (fromMe) return { respond: false, reason: "mensagem_propria" };
  if (ticket.isGroup) return { respond: false, reason: "grupo" };
  if (!hasText) return { respond: false, reason: "sem_texto" };

  // Humano assumiu: o agente sai de cena, mesmo se estiver marcado.
  if (ticket.userId) return { respond: false, reason: "atendente_humano" };

  // Passada para humano nesta conversa: vale sempre, inclusive no modo teste.
  if (ticket.sdrAgentEnabled === false) {
    return { respond: false, reason: "desligado_no_ticket" };
  }

  // Sem prompt nao ha o que seguir: o agente nao responde. (Fica depois dos
  // motivos de 'humano': para quem ja esta com a equipe, esse e o motivo util.)
  if (!String(settings.systemPrompt || "").trim()) {
    return { respond: false, reason: "sem_prompt" };
  }

  // Modo teste: so atende os numeros da lista (e atende todos eles, sem
  // precisar marcar a conversa). Quem nao esta na lista nao e afetado.
  if (settings.testMode) {
    return numberAllowed(parseAllowedNumbers(settings.allowedNumbers), contactNumber)
      ? { respond: true }
      : { respond: false, reason: "modo_teste_numero_nao_listado" };
  }

  const on = ticket.sdrAgentEnabled === true || settings.autoEnableForNewTickets;
  if (!on) return { respond: false, reason: "ticket_nao_marcado" };

  return { respond: true };
};
