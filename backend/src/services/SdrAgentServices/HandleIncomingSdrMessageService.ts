import { logger } from "../../utils/logger";
import { isAudioType } from "./audio";
import { isEngineReady } from "../AiEngineServices/engines";
import { decideSdrReply } from "./policy";
import { SdrScheduler } from "./scheduler";
import { getSdrAgentSettings } from "./SdrAgentSettingsService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";

interface Request {
  ticket: {
    id: number;
    status?: string;
    isGroup: boolean;
    userId?: number | null;
    sdrAgentEnabled?: boolean | null;
  };
  contactNumber?: string | null;
  messageBody?: string | null;
  mediaType?: string | null;
  fromMe: boolean;
}

// Carregado so na primeira mensagem atendida: evita import circular com o
// envio de WhatsApp, que por sua vez conhece os handlers de eventos.
let scheduler: SdrScheduler | null = null;
const getScheduler = async (): Promise<SdrScheduler> => {
  if (!scheduler) {
    const { runSdrAgentForTicket } = await import("./RunSdrAgentService");
    scheduler = new SdrScheduler(runSdrAgentForTicket);
  }
  return scheduler;
};

// Chamado pelo handleMessage a cada mensagem recebida. Devolve `handled: true`
// so quando o agente assumiu a resposta (ai o handleMessage nao deve disparar a
// saudacao/fila de atendimento). QUALQUER problema aqui devolve handled:false:
// o atendimento segue exatamente como era antes do agente existir.
const HandleIncomingSdrMessageService = async ({
  ticket,
  contactNumber,
  messageBody,
  mediaType,
  fromMe
}: Request): Promise<{ handled: boolean; reason?: string }> => {
  try {
    const settings = await getSdrAgentSettings();

    const decision = decideSdrReply({
      settings,
      ticket,
      contactNumber,
      fromMe,
      // Audio tambem conta: o agente transcreve e responde (ver RunSdrAgentService).
      hasText:
        isAudioType(mediaType) ||
        ((!mediaType || mediaType === "chat") && Boolean(String(messageBody || "").trim()))
    });
    if (!decision.respond) {
      return { handled: false, reason: (decision as any).reason };
    }

    // Sem nenhuma IA ativa o agente nao consegue responder: deixa o fluxo
    // normal (fila de atendentes) cuidar do lead.
    if (!(await isEngineReady(settings.aiEngine))) {
      return { handled: false, reason: "nenhuma_ia_ativa" };
    }

    // Se a IA assumiu, a conversa esta sendo atendida.
    // Mantem OPEN e sem usuario humano.
    if (ticket.status !== "open" || ticket.sdrAgentEnabled !== true) {
      await UpdateTicketService({
        ticketData: {
          status: "open",
          userId: null
        },
        ticketId: ticket.id,
        sdrAgentEnabled: true
      });
    }

    (await getScheduler()).schedule(ticket.id, settings.replyDelaySeconds);
    return { handled: true };
  } catch (err) {
    logger.error({ err, ticketId: ticket.id }, "[sdr] erro ao avaliar mensagem; seguindo o fluxo normal");
    return { handled: false, reason: "erro" };
  }
};

export default HandleIncomingSdrMessageService;
