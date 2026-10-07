import fs from "fs";
import Message from "../../models/Message";
import SendWhatsAppMedia from "../WbotServices/SendWhatsAppMedia";
import {
  buildVoiceReplyFile,
  isAudioType,
  transcribeAudioFile,
  voiceReplyEnabled
} from "./audio";
import SdrAgentSetting from "../../models/SdrAgentSetting";
import { logger } from "../../utils/logger";
import { sleep } from "../../utils/sleep";
import { GetCrmM2mOperationalConfig } from "../CrmIntegrationServices/CrmM2mOperationalConfigService";
import { ReadCrmM2mLocalIntegrationId } from "../CrmIntegrationServices/CrmM2mRuntimeConfiguration";
import Ticket from "../../models/Ticket";
import { DEFAULT_TIMEZONE } from "./timezone";
import CreateOpenAILogService from "../OpenAILogServices/CreateOpenAILogService";
import ShowTicketService from "../TicketServices/ShowTicketService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import { AgentLoopResult, ChatFn, ChatMessage, runAgentLoop } from "./agentLoop";
import { createEngineChat } from "../AiEngineServices/engines";
import { retrieveForConversation } from "../SdrKnowledgeServices/KnowledgeService";
import { toChatHistory, splitReply } from "./conversation";
import { decideSdrReply } from "./policy";
import { renderPrompt } from "./promptTemplate";
import { effectivePrompt, getSdrAgentSettings } from "./SdrAgentSettingsService";
import { CrmToolContext, executeTool, TOOL_DEFINITIONS, ToolContext } from "./tools";

const CHUNK_DELAY_MS = 1200;

interface ConverseInput {
  settings: SdrAgentSetting;
  history: ChatMessage[];
  contact: { name?: string | null; number?: string | null };
  toolContext: ToolContext;
  chat: ChatFn;
}

// Monta o prompt, roda o laco do agente e devolve a resposta (nao envia nada).
export const converse = async ({
  settings,
  history,
  contact,
  toolContext,
  chat
}: ConverseInput): Promise<
  AgentLoopResult & { knowledge: { fileName: string; score: number }[] }
> => {
  const basePrompt = renderPrompt(effectivePrompt(settings), {
    now: new Date(),
    timeZone: DEFAULT_TIMEZONE,
    contactName: contact.name,
    contactNumber: contact.number,
    companyName: settings.companyName
  });

  // Base de conhecimento: trechos relacionados as ultimas falas do lead.
  const knowledge = await retrieveForConversation(
    history.filter(m => m.role === "user").map(m => String(m.content || ""))
  );
  const system = knowledge.text ? `${basePrompt}\n\n${knowledge.text}` : basePrompt;

  const result = await runAgentLoop({
    chat,
    messages: [{ role: "system", content: system }, ...history],
    tools: TOOL_DEFINITIONS,
    maxRounds: settings.maxToolRounds,
    runTool: (name, args) => executeTool(name, args, toolContext)
  });

  return { ...result, knowledge: knowledge.sources };
};

const latestMessageId = async (ticketId: number): Promise<string | null> => {
  const last = await Message.findOne({
    where: { ticketId },
    order: [["createdAt", "DESC"]],
    attributes: ["id"]
  });
  return last ? last.id : null;
};

// Contexto do CRM para as ferramentas: integracao, funil SDR e etapa atual do lead.
// Sem integracao configurada (ou CRM desligado) as ferramentas de CRM respondem
// "indisponivel" e a BIA usa transfer_to_human; nada quebra.
const buildCrmContext = async (ticket: Ticket): Promise<CrmToolContext> => {
  const off: CrmToolContext = {
    integrationId: null,
    pipelineName: null,
    currentStage: null,
    persistStage: async () => undefined
  };
  let integrationId: number | null = null;
  try {
    integrationId = ReadCrmM2mLocalIntegrationId();
  } catch (err) {
    logger.warn({ err }, "[sdr] SAMACHAT_CRM_M2M_INTEGRATION_ID invalido; CRM desligado para a BIA");
  }
  if (!integrationId) return off;

  try {
    const config = await GetCrmM2mOperationalConfig(integrationId);
    return {
      integrationId,
      pipelineName: config.commercialPipelineName,
      // Ate a BIA avancar, o lead esta na etapa de admissao do CRM.
      currentStage: ticket.sdrCrmStage || config.commercialStageName,
      timeZone: DEFAULT_TIMEZONE,
      persistStage: async stage => {
        await ticket.update({ sdrCrmStage: stage });
      }
    };
  } catch (err) {
    logger.warn({ err, ticketId: ticket.id }, "[sdr] configuracao do CRM indisponivel");
    return off;
  }
};

// Caminho de PRODUCAO: roda o agente para um ticket e responde no WhatsApp.
export const runSdrAgentForTicket = async (ticketId: number): Promise<void> => {
  const settings = await getSdrAgentSettings();
  const ticket = await ShowTicketService(ticketId);

  // Reconfere as travas na hora de rodar: durante a espera um atendente pode
  // ter assumido o ticket ou o agente ter sido desligado.
  const decision = decideSdrReply({
    settings,
    ticket,
    contactNumber: ticket.contact.number,
    fromMe: false,
    hasText: true
  });
  if (!decision.respond) {
    logger.info({ ticketId, reason: (decision as any).reason }, "[sdr] nao respondeu");
    return;
  }

  const rows = await Message.findAll({
    where: { ticketId },
    order: [["createdAt", "DESC"]],
    limit: settings.maxHistoryMessages
  });
  const ordered = rows.reverse();

  // Audios do lead (os mais recentes) viram texto para o agente entender.
  const transcripts = new Map<string, string>();
  const recentAudios = ordered.filter(m => !m.fromMe && isAudioType(m.mediaType)).slice(-3);
  for (const m of recentAudios) {
    const file = m.getDataValue("mediaUrl");
    if (!file) continue;
    const text = await transcribeAudioFile(m.id, file);
    if (text) transcripts.set(m.id, text);
  }

  const history = toChatHistory(ordered, transcripts);
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return; // nada novo do lead para responder
  }
  const lastRow = ordered[ordered.length - 1];
  const leadSentAudio = Boolean(lastRow && !lastRow.fromMe && isAudioType(lastRow.mediaType));

  const snapshotLast = await latestMessageId(ticketId);
  let transferred = false;

  try {
    const result = await converse({
      settings,
      history,
      contact: ticket.contact,
      chat: createEngineChat({
        engine: settings.aiEngine,
        model: settings.model,
        temperature: settings.temperature,
        ticketId,
        contactId: ticket.contactId
      }),
      toolContext: {
        contactId: ticket.contactId,
        ticketId,
        crm: await buildCrmContext(ticket),
        onTransfer: async ({ reason, summary }) => {
          transferred = true;
          await ticket.update({ sdrAgentEnabled: false, status: "pending" });
          await CreateOpenAILogService({
            action: "sdr_transfer",
            status: "success",
            response: summary,
            ticketId,
            contactId: ticket.contactId,
            metadata: { reason }
          });
        }
      }
    });

    if (!result.reply) {
      logger.warn({ ticketId }, "[sdr] modelo devolveu resposta vazia");
      return;
    }

    // Chegou mensagem nova (do lead ou de um atendente) enquanto o modelo
    // pensava: descarta esta resposta; a nova mensagem dispara outra execucao.
    if ((await latestMessageId(ticketId)) !== snapshotLast) {
      logger.info({ ticketId }, "[sdr] resposta descartada: conversa mudou durante a execucao");
      return;
    }

    const chunks = splitReply(result.reply);

    // Lead mandou audio e a voz esta ligada: responde falando. Se a voz falhar
    // (chave, limite, rede), cai para texto: o lead nunca fica sem resposta.
    let sentAsVoice = false;
    if (leadSentAudio && (await voiceReplyEnabled())) {
      const voice = await buildVoiceReplyFile(chunks.join(" "));
      if (voice) {
        try {
          await SendWhatsAppMedia({ media: voice as any, ticket });
          sentAsVoice = true;
        } catch (err) {
          logger.warn({ err, ticketId }, "[sdr] envio do audio falhou; mandando texto");
          try {
            fs.unlinkSync(voice.path);
          } catch (e) {
            // arquivo ja foi removido pelo envio
          }
        }
      }
    }

    if (!sentAsVoice) {
      for (let i = 0; i < chunks.length; i += 1) {
        await SendWhatsAppMessage({ body: chunks[i], ticket });
        if (i < chunks.length - 1) await sleep(CHUNK_DELAY_MS);
      }
    }
  } catch (err) {
    // Falhou (OpenAI fora, chave invalida...): tira o agente deste ticket para
    // um humano assumir pelo fluxo normal, em vez de deixar o lead sem resposta.
    logger.error({ err, ticketId }, "[sdr] falha; devolvendo o ticket para atendimento humano");
    if (!transferred) {
      await ticket.update({ sdrAgentEnabled: false, status: "pending" });
    }
  }
};
