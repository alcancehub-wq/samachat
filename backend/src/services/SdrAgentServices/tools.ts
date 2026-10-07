import { randomUUID } from "crypto";
import AppError from "../../errors/AppError";
import {
  CrmM2mCloserAvailabilityInput,
  CrmM2mCloserAvailabilityResult,
  CrmM2mScheduleCloserMeetingInput,
  CrmM2mScheduleCloserMeetingResult,
  GetCrmM2mCloserAvailability,
  ScheduleCrmM2mCloserMeeting
} from "../CrmIntegrationServices/CrmM2mCloserSchedulingService";
import {
  CrmM2mCloserHandoffInput,
  CrmM2mCloserHandoffResult,
  HandoffCrmM2mCloser
} from "../CrmIntegrationServices/CrmM2mCloserHandoffService";
import AdvanceCrmM2mSdrStage, {
  CrmM2mSdrStageAdvanceInput,
  CrmM2mSdrStageAdvanceResult
} from "../CrmIntegrationServices/CrmM2mSdrStageAdvanceService";
import { DEFAULT_TIMEZONE, toZonedParts, zonedToUtc } from "./timezone";

// Ferramentas que o modelo pode chamar.
//
// A BIA NAO tem agenda, funil nem closers proprios. Disponibilidade, agendamento,
// handoff SDR->Closer e avanco de etapa sao do CRM (CrmIntegrationServices): aqui
// so traduzimos a conversa em chamadas a esses servicos.
export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description:
        "Consultar no CRM se há closer REALMENTE disponível em um dia e horário. Use SEMPRE antes de sugerir ou confirmar qualquer horário ao cliente. Nunca afirme que um horário está disponível sem ter chamado esta função. Para oferecer opções, consulte um horário por vez.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Data, formato YYYY-MM-DD" },
          time: {
            type: "string",
            description: "Horário de início, formato HH:MM (24h). Ex: '14:00'"
          },
          duration: {
            type: "number",
            description: "Duração em minutos. Padrão: 60"
          }
        },
        required: ["date", "time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_appointment",
      description:
        "Agendar a reunião do cliente com um closer no CRM e já passar o atendimento ao closer. Use SOMENTE depois que o cliente confirmou um dia e horário que check_availability mostrou como disponível.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Título da reunião (ex: 'Apresentação do empreendimento')"
          },
          date: { type: "string", description: "Data, formato YYYY-MM-DD" },
          time: {
            type: "string",
            description: "Horário de início, formato HH:MM (24h)"
          },
          duration: {
            type: "number",
            description: "Duração em minutos. Padrão: 60"
          },
          description: {
            type: "string",
            description:
              "Pauta/contexto para o closer: o que o cliente busca, orçamento, prazo."
          }
        },
        required: ["title", "date", "time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "advance_stage",
      description:
        "Avançar o lead para a próxima etapa do funil SDR no CRM quando ele cumprir o critério da etapa (ex.: respondeu, demonstrou interesse, qualificado). Use o nome EXATO da etapa. Não use para agendamento: create_appointment já cuida disso.",
      parameters: {
        type: "object",
        properties: {
          to_stage: {
            type: "string",
            description: "Nome exato da etapa de destino no funil SDR"
          },
          reason: {
            type: "string",
            description: "Motivo curto do avanço, para o histórico do CRM"
          }
        },
        required: ["to_stage"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "transfer_to_human",
      description:
        "Passar a conversa para um atendente humano. Use quando o cliente pedir para falar com uma pessoa, pedir para cancelar ou remarcar uma reunião, reclamar, quando o assunto sair do escopo ou quando você não tiver certeza da resposta. Depois de chamar esta função, avise o cliente de que a equipe vai assumir. NUNCA diga que vai encaminhar sem chamar esta função.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            enum: [
              "pedido_do_cliente",
              "reclamacao",
              "fora_do_escopo",
              "duvida_sem_resposta",
              "cancelar_ou_remarcar",
              "pediu_para_nao_ser_contatado"
            ],
            description: "Motivo da transferência"
          },
          summary: {
            type: "string",
            description:
              "Resumo em uma ou duas frases do que o cliente precisa, para o atendente assumir sem reler a conversa."
          }
        },
        required: ["reason", "summary"]
      }
    }
  }
];

// Servicos do CRM injetaveis (testes usam fakes; producao usa os reais).
export interface CrmApi {
  getAvailability: (
    input: CrmM2mCloserAvailabilityInput
  ) => Promise<CrmM2mCloserAvailabilityResult>;
  scheduleMeeting: (
    input: CrmM2mScheduleCloserMeetingInput
  ) => Promise<CrmM2mScheduleCloserMeetingResult>;
  handoffCloser: (
    input: CrmM2mCloserHandoffInput
  ) => Promise<CrmM2mCloserHandoffResult>;
  advanceStage: (
    input: CrmM2mSdrStageAdvanceInput
  ) => Promise<CrmM2mSdrStageAdvanceResult>;
}

export const defaultCrmApi: CrmApi = {
  getAvailability: input => GetCrmM2mCloserAvailability(input),
  scheduleMeeting: input => ScheduleCrmM2mCloserMeeting(input),
  handoffCloser: input => HandoffCrmM2mCloser(input),
  advanceStage: input => AdvanceCrmM2mSdrStage(input)
};

export interface CrmToolContext {
  // Integracao CRM M2M local (SAMACHAT_CRM_M2M_INTEGRATION_ID). null = CRM desligado.
  integrationId: number | null;
  // Funil SDR e etapa atual do lead (a etapa de admissao, ate a BIA avancar).
  pipelineName: string | null;
  currentStage: string | null;
  // Grava a nova etapa do lead depois que o CRM confirma o avanco.
  persistStage: (stage: string) => Promise<void>;
  timeZone?: string;
  api?: CrmApi;
}

export interface ToolContext {
  contactId?: number | null;
  ticketId?: number | null;
  crm?: CrmToolContext;
  onTransfer: (args: { reason: string; summary: string }) => Promise<void>;
}

// Mensagens em portugues para o modelo saber o que fazer com cada resultado do CRM.
const CRM_DISABLED =
  "A integração com o CRM está indisponível agora. Use transfer_to_human.";

const hintForCode = (code: string): string => {
  if (code === "invalid_request") {
    return "Dados inválidos. Confira data (YYYY-MM-DD), hora (HH:MM) e duração.";
  }
  if (/^http_4(01|03)$/.test(code)) return CRM_DISABLED;
  return "Não foi possível concluir essa ação no CRM. Use transfer_to_human.";
};

const parseArgs = (raw: unknown): Record<string, any> | null => {
  if (raw && typeof raw === "object") return raw as Record<string, any>;
  try {
    const parsed = JSON.parse(String(raw || "{}"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (err) {
    return null;
  }
};

const MAX_DURATION_MINUTES = 240;

interface Window {
  startAt: string;
  endAt: string;
  date: string;
  time: string;
  durationMinutes: number;
}

const buildWindow = (
  args: Record<string, any>,
  timeZone: string,
  now: Date
): Window | { error: string; message: string } => {
  const date = String(args.date || "");
  const time = String(args.time || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(time)) {
    return {
      error: "invalid_datetime",
      message: "Data ou hora em formato inválido. Use YYYY-MM-DD e HH:MM."
    };
  }
  const durationMinutes = args.duration ? Number(args.duration) : 60;
  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 15 ||
    durationMinutes > MAX_DURATION_MINUTES
  ) {
    return {
      error: "invalid_duration",
      message: "Duração inválida. Use entre 15 e 240 minutos."
    };
  }
  const start = zonedToUtc(date, time, timeZone);
  if (Number.isNaN(start.getTime())) {
    return {
      error: "invalid_datetime",
      message: "Data ou hora em formato inválido. Use YYYY-MM-DD e HH:MM."
    };
  }
  if (start.getTime() <= now.getTime()) {
    return {
      error: "date_in_past",
      message: "Esse dia/horário já passou. Peça outra data ao cliente."
    };
  }
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const local = toZonedParts(start, timeZone);
  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    date: local.date,
    time: local.time,
    durationMinutes
  };
};

export const executeTool = async (
  name: string,
  rawArgs: unknown,
  ctx: ToolContext,
  now: Date = new Date()
): Promise<Record<string, unknown>> => {
  const args = parseArgs(rawArgs);
  if (!args) {
    return { error: "invalid_arguments", message: "Argumentos inválidos." };
  }

  const crm = ctx.crm;
  const api = crm?.api || defaultCrmApi;
  const timeZone = crm?.timeZone || DEFAULT_TIMEZONE;
  const crmReady = Boolean(crm && crm.integrationId && ctx.contactId);

  try {
    switch (name) {
      case "check_availability": {
        if (!crmReady) return { error: "crm_unavailable", message: CRM_DISABLED };
        const window = buildWindow(args, timeZone, now);
        if ("error" in window) return window;

        const result = await api.getAvailability({
          localIntegrationId: crm!.integrationId!,
          requestId: randomUUID(),
          startAt: window.startAt,
          endAt: window.endAt
        });
        if (result.state === "disabled") {
          return { error: "crm_unavailable", message: CRM_DISABLED };
        }
        if (result.state !== "available") {
          return { error: result.code, message: hintForCode(result.code) };
        }
        const closers = result.receipt.availableClosers;
        return {
          date: window.date,
          time: window.time,
          duration_minutes: window.durationMinutes,
          timezone: timeZone,
          available: closers.length > 0,
          available_closers: closers.map(closer => closer.name),
          note: closers.length
            ? "Há closer disponível neste horário. Confirme com o cliente antes de agendar."
            : "Nenhum closer disponível neste horário. Ofereça outro horário e consulte de novo."
        };
      }

      case "create_appointment": {
        if (!crmReady) return { error: "crm_unavailable", message: CRM_DISABLED };
        const window = buildWindow(args, timeZone, now);
        if ("error" in window) return window;
        const title = String(args.title || "").trim().slice(0, 200);
        if (!title) {
          return { error: "invalid_title", message: "Informe o título da reunião." };
        }

        // Escolhe o closer pela disponibilidade do CRM (a regra de rodizio e do CRM).
        const availability = await api.getAvailability({
          localIntegrationId: crm!.integrationId!,
          requestId: randomUUID(),
          startAt: window.startAt,
          endAt: window.endAt
        });
        if (availability.state === "disabled") {
          return { error: "crm_unavailable", message: CRM_DISABLED };
        }
        if (availability.state !== "available") {
          return { error: availability.code, message: hintForCode(availability.code) };
        }
        const closer = availability.receipt.availableClosers[0];
        if (!closer) {
          return {
            error: "no_closer_available",
            message:
              "Horário indisponível. Chame check_availability e ofereça outro horário."
          };
        }

        const scheduled = await api.scheduleMeeting({
          localIntegrationId: crm!.integrationId!,
          requestId: randomUUID(),
          sourceContactId: ctx.contactId!,
          closerEmail: closer.email,
          startAt: window.startAt,
          endAt: window.endAt,
          title,
          description: args.description
            ? String(args.description).slice(0, 2000)
            : null
        });
        if (scheduled.state === "disabled") {
          return { error: "crm_unavailable", message: CRM_DISABLED };
        }
        if (scheduled.state !== "scheduled") {
          return { error: scheduled.code, message: hintForCode(scheduled.code) };
        }
        const meeting = scheduled.receipt;

        // Agendou: passa o atendimento ao closer pelo motor do CRM.
        const handoff = await api.handoffCloser({
          localIntegrationId: crm!.integrationId!,
          requestId: randomUUID(),
          sourceContactId: ctx.contactId!,
          meetingId: meeting.meetingId
        });

        return {
          ok: true,
          appointment: {
            id: meeting.meetingId,
            title,
            date: window.date,
            time: window.time,
            duration_minutes: window.durationMinutes,
            closer: meeting.closerName
          },
          handoff_done: handoff.state === "handed_off",
          note:
            handoff.state === "handed_off"
              ? "Reunião agendada e atendimento passado ao closer. Confirme ao cliente com suas palavras."
              : "Reunião agendada. A passagem ao closer ficou pendente no CRM; confirme a reunião ao cliente normalmente."
        };
      }

      case "advance_stage": {
        if (!crmReady || !crm!.pipelineName || !crm!.currentStage) {
          return { error: "crm_unavailable", message: CRM_DISABLED };
        }
        const toStage = String(args.to_stage || "").trim();
        if (!toStage) {
          return { error: "invalid_stage", message: "Informe o nome da etapa de destino." };
        }
        const result = await api.advanceStage({
          localIntegrationId: crm!.integrationId!,
          requestId: randomUUID(),
          sourceContactId: ctx.contactId!,
          pipelineName: crm!.pipelineName!,
          fromStageName: crm!.currentStage!,
          toStageName: toStage,
          reason: args.reason ? String(args.reason).slice(0, 500) : null
        });
        if (result.state === "disabled") {
          return { error: "crm_unavailable", message: CRM_DISABLED };
        }
        if (result.state !== "moved") {
          return {
            error: result.code,
            message:
              "O CRM não aceitou essa mudança de etapa. Não diga ao cliente que algo mudou."
          };
        }
        await crm!.persistStage(toStage);
        return { ok: true, stage: toStage };
      }

      case "transfer_to_human": {
        await ctx.onTransfer({
          reason: String(args.reason || "pedido_do_cliente"),
          summary: String(args.summary || "")
        });
        return {
          ok: true,
          note: "Conversa transferida. Avise o cliente de que a equipe vai assumir."
        };
      }

      default:
        return { error: "unknown_tool", message: `Ferramenta desconhecida: ${name}` };
    }
  } catch (err) {
    if (err instanceof AppError) {
      return {
        error: err.message,
        message: "Não foi possível concluir essa ação. Use transfer_to_human."
      };
    }
    throw err; // erro inesperado: quem chamou decide (nao vira texto para o lead)
  }
};
