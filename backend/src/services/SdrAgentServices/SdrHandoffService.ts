import AppError from "../../errors/AppError";
import ShowTicketService, {
  TicketAccessData
} from "../TicketServices/ShowTicketService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import { isEngineReady } from "../AiEngineServices/engines";
import { decideSdrReply } from "./policy";
import { effectivePrompt, getSdrAgentSettings } from "./SdrAgentSettingsService";

export type HandoffMode = "ai" | "human";

export interface HandoffState {
  mode: HandoffMode;
  // Por que o modo e esse (codigo da politica; a tela traduz para texto).
  reason: string | null;
  agentEnabled: boolean;
  hasPrompt: boolean;
  testMode: boolean;
}

// Quem esta atendendo ESTA conversa agora, pela mesma regra que o agente usa
// para decidir se responde (policy.ts): a tela nunca mostra algo diferente do
// que de fato acontece.
export const getHandoffState = async (
  ticketId: number,
  accessData?: TicketAccessData
): Promise<HandoffState> => {
  const settings = await getSdrAgentSettings();
  const ticket = await ShowTicketService(ticketId, accessData);

  const decision = decideSdrReply({
    settings,
    ticket,
    contactNumber: ticket.contact?.number,
    fromMe: false,
    hasText: true
  });

  return {
    mode: decision.respond ? "ai" : "human",
    reason: decision.respond ? null : (decision as any).reason,
    agentEnabled: settings.isEnabled,
    hasPrompt: Boolean(String(settings.systemPrompt || "").trim()),
    testMode: Boolean(settings.testMode)
  };
};

// Passa a conversa para a IA ou para um humano (so o ticket: o funil comercial e do CRM).
// - human: a IA para de responder e a conversa passa para quem clicou.
// - ai: a IA volta a responder; se um atendente estava com a conversa, ela sai
//   do nome dele e volta para "Aguardando".
export const setHandoff = async (
  ticketId: number,
  mode: HandoffMode,
  userId?: number,
  accessData?: TicketAccessData
): Promise<HandoffState> => {
  const ticket = await ShowTicketService(ticketId, accessData);

  if (mode === "ai") {
    // Confere o modulo Treinamento da IA na hora: agente ligado e com prompt.
    const settings = await getSdrAgentSettings();
    if (!settings.isEnabled) throw new AppError("ERR_SDR_AGENT_DISABLED", 400);
    if (!effectivePrompt(settings)) throw new AppError("ERR_SDR_NO_PROMPT", 400);
    if (!(await isEngineReady(settings.aiEngine))) throw new AppError("ERR_AI_NO_ENGINE", 400);

    await ticket.update({ sdrAgentEnabled: true });
    await UpdateTicketService({
      ticketData: { status: "open", userId: null as any },
      ticketId,
      accessData
    });
  } else if (mode === "human") {
    // Assumir: a IA para e a conversa passa para quem clicou, ja liberada para
    // responder (nao existe mais o passo de "aceitar").
    await ticket.update({ sdrAgentEnabled: false });
    await UpdateTicketService({
      ticketData: { status: "open", userId },
      ticketId,
      accessData
    });
  } else {
    throw new AppError("ERR_SDR_INVALID_HANDOFF_MODE", 400);
  }

  return getHandoffState(ticketId, accessData);
};
