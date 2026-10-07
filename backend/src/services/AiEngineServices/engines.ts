import axios from "axios";

import AppError from "../../errors/AppError";
import GetOpenAISettingsService from "../OpenAISettingsServices/GetOpenAISettingsService";
import CreateOpenAILogService from "../OpenAILogServices/CreateOpenAILogService";
import { getIntegrationConfig } from "../IntegrationSettingsServices/IntegrationSettingsService";
import { ChatFn, ChatMessage, ChatResult } from "../SdrAgentServices/agentLoop";
import { createOpenAIChat } from "../SdrAgentServices/openAIChat";
import { fromAnthropicResponse, toAnthropicRequest } from "./claudeAdapter";

export type EngineId = "openai" | "gemini" | "claude";

export const ENGINE_IDS: EngineId[] = ["openai", "gemini", "claude"];

export const ENGINE_LABELS: Record<EngineId, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  claude: "Claude"
};

export interface ChatOpts {
  model?: string | null; // so vale para a OpenAI (nome de modelo dela)
  temperature?: number | null;
  ticketId?: number | null;
  contactId?: number | null;
  maxTokens?: number;
  action?: string;
  engine?: string | null; // motor escolhido no agente (vazio = primeiro disponivel)
}

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_VERSION = "2023-06-01";

export interface EngineState {
  configured: boolean;
  active: boolean;
  model: string | null;
}

export const getEngineStates = async (): Promise<Record<EngineId, EngineState>> => {
  const openai = await GetOpenAISettingsService();
  const gemini = await getIntegrationConfig("gemini");
  const claude = await getIntegrationConfig("claude");

  return {
    openai: {
      configured: Boolean(openai.apiKey),
      active: Boolean(openai.isActive && openai.apiKey),
      model: openai.model || null
    },
    gemini: {
      configured: Boolean(gemini.values.apiKey),
      active: Boolean(gemini.isActive && gemini.values.apiKey),
      model: gemini.values.model || null
    },
    claude: {
      configured: Boolean(claude.values.apiKey),
      active: Boolean(claude.isActive && claude.values.apiKey),
      model: claude.values.model || null
    }
  };
};

// Qual IA conversa com os leads. A escolha e do AGENTE SDR (Treinamento da IA):
// `preferred` e o motor salvo nele. Escolhido e indisponivel (sem chave ou
// desligado) = nenhum motor, para nunca trocar de IA em silencio. Sem escolha =
// o primeiro disponivel.
export const getActiveEngine = async (
  preferred?: string | null
): Promise<EngineId | null> => {
  const states = await getEngineStates();
  if (preferred) {
    return (ENGINE_IDS as string[]).includes(preferred) &&
      states[preferred as EngineId].active
      ? (preferred as EngineId)
      : null;
  }
  return ENGINE_IDS.find(id => states[id].active) || null;
};

export const isEngineReady = async (preferred?: string | null): Promise<boolean> =>
  (await getActiveEngine(preferred)) !== null;


// Erro de HTTP de qualquer motor -> codigo unico (a tela traduz).
const mapHttpError = (err: any): AppError => {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const apiMessage = String(
    (Array.isArray(data) ? data[0]?.error?.message : data?.error?.message) || ""
  );
  // O Google responde 400 ("API key not valid") quando a chave esta errada.
  if (status === 400 && /api key/i.test(apiMessage)) {
    return new AppError("ERR_AI_UNAUTHORIZED", 401);
  }
  if (status === 401 || status === 403) return new AppError("ERR_AI_UNAUTHORIZED", 401);
  if (status === 429) return new AppError("ERR_AI_RATE_LIMIT", 429);
  if (status === 404) return new AppError("ERR_AI_MODEL_NOT_FOUND", 404);
  if (status === 400) return new AppError("ERR_AI_BAD_REQUEST", 400);
  if (status && status >= 500) return new AppError("ERR_AI_UPSTREAM", 502);
  return new AppError("ERR_AI_REQUEST_FAILED", 502);
};

const logCall = async (
  engine: EngineId,
  opts: ChatOpts,
  model: string,
  started: number,
  result?: ChatResult,
  error?: string
): Promise<void> => {
  try {
    await CreateOpenAILogService({
      action: opts.action || "sdr_agent",
      status: error ? "error" : "success",
      model,
      response: result
        ? result.message.content || (result.message.tool_calls ? "[tool_calls]" : "")
        : undefined,
      error,
      durationMs: Date.now() - started,
      promptTokens: result?.usage?.promptTokens,
      completionTokens: result?.usage?.completionTokens,
      totalTokens: result?.usage?.totalTokens,
      ticketId: opts.ticketId,
      contactId: opts.contactId,
      metadata: { engine }
    });
  } catch (err) {
    // log nunca derruba o atendimento
  }
};

// Gemini: mesmo formato da OpenAI, em outro endereco.
export const geminiChat = async (
  values: Record<string, any>,
  opts: ChatOpts,
  params: { messages: ChatMessage[]; tools?: unknown[] }
): Promise<ChatResult> => {
  const model = values.model || "gemini-3.5-flash";
  const started = Date.now();
  try {
    const response = await axios.post(
      GEMINI_URL,
      {
        model,
        messages: params.messages,
        temperature: opts.temperature ?? 0.7,
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
        ...(params.tools && params.tools.length
          ? { tools: params.tools, tool_choice: "auto" }
          : {})
      },
      {
        headers: { Authorization: `Bearer ${values.apiKey}` },
        timeout: 60000
      }
    );

    const choice = response.data?.choices?.[0]?.message;
    const usage = response.data?.usage || {};
    const result: ChatResult = {
      message: choice || { role: "assistant", content: "" },
      model: response.data?.model || model,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      }
    };
    await logCall("gemini", opts, model, started, result);
    return result;
  } catch (err) {
    const message = err?.response?.data?.error?.message || err?.message || "Gemini failed";
    await logCall("gemini", opts, model, started, undefined, String(message));
    throw mapHttpError(err);
  }
};

// Claude: API nativa da Anthropic (Messages), com conversao do formato.
export const claudeChat = async (
  values: Record<string, any>,
  opts: ChatOpts,
  params: { messages: ChatMessage[]; tools?: unknown[] }
): Promise<ChatResult> => {
  const model = values.model || "claude-sonnet-5-5";
  const started = Date.now();
  const parts = toAnthropicRequest(params.messages, params.tools as any[]);

  const body: Record<string, any> = {
    model,
    max_tokens: opts.maxTokens || 1024,
    messages: parts.messages,
    ...(parts.system ? { system: parts.system } : {}),
    ...(parts.tools ? { tools: parts.tools, tool_choice: { type: "auto" } } : {})
  };
  // A Claude aceita temperatura de 0 a 1.
  if (typeof opts.temperature === "number") {
    body.temperature = Math.min(1, Math.max(0, opts.temperature));
  }

  const headers = {
    "x-api-key": values.apiKey,
    "anthropic-version": CLAUDE_VERSION,
    "content-type": "application/json"
  };

  try {
    let response;
    try {
      response = await axios.post(CLAUDE_URL, body, { headers, timeout: 60000 });
    } catch (err) {
      // Alguns modelos nao aceitam temperatura: tenta de novo sem ela.
      if (err?.response?.status === 400 && "temperature" in body) {
        delete body.temperature;
        response = await axios.post(CLAUDE_URL, body, { headers, timeout: 60000 });
      } else {
        throw err;
      }
    }
    const result = fromAnthropicResponse(response.data);
    await logCall("claude", opts, model, started, result);
    return result;
  } catch (err) {
    const message = err?.response?.data?.error?.message || err?.message || "Claude failed";
    await logCall("claude", opts, model, started, undefined, String(message));
    throw mapHttpError(err);
  }
};

// O ponto unico que o agente usa: resolve o motor ativo a CADA chamada, entao
// trocar de IA vale na proxima mensagem, sem reiniciar nada.
export const createEngineChat = (opts: ChatOpts): ChatFn => async params => {
  const engine = await getActiveEngine(opts.engine);
  if (!engine) throw new AppError("ERR_AI_NO_ENGINE", 400);

  if (engine === "openai") {
    return createOpenAIChat({
      model: opts.model,
      temperature: opts.temperature,
      ticketId: opts.ticketId,
      contactId: opts.contactId
    })(params);
  }

  const { values } = await getIntegrationConfig(engine);
  return engine === "gemini"
    ? geminiChat(values, opts, params)
    : claudeChat(values, opts, params);
};

// Texto simples (sem ferramentas) com o motor ativo. So para Gemini e Claude:
// o caminho da OpenAI continua com o servico dela.
export const engineComplete = async (
  prompt: string,
  opts: ChatOpts = {}
): Promise<{ text: string; model: string; engine: EngineId }> => {
  const engine = await getActiveEngine(opts.engine);
  if (!engine || engine === "openai") throw new AppError("ERR_AI_NO_ENGINE", 400);

  const { values } = await getIntegrationConfig(engine);
  const params = { messages: [{ role: "user", content: prompt } as ChatMessage] };
  const fn = engine === "gemini" ? geminiChat : claudeChat;
  const result = await fn(values, { maxTokens: 4000, temperature: 0.4, ...opts }, params);
  return {
    text: String(result.message.content || ""),
    model: result.model || String(values.model),
    engine
  };
};
