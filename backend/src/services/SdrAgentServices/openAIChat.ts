import AppError from "../../errors/AppError";
import GetOpenAISettingsService from "../OpenAISettingsServices/GetOpenAISettingsService";
import CreateOpenAILogService from "../OpenAILogServices/CreateOpenAILogService";
import buildClient from "../OpenAI/OpenAIClient";
import { ChatFn } from "./agentLoop";

// A OpenAI esta pronta para o agente? (config ativa e com chave)
export const isOpenAIReady = async (): Promise<boolean> => {
  const s = await GetOpenAISettingsService();
  return Boolean(s.isActive && s.apiKey);
};

// Chat com ferramentas (tool calling) usando a chave e o modelo ja
// configurados na tela de OpenAI do SamaChat. Cada chamada vai para o log.
export const createOpenAIChat = (opts: {
  model?: string | null;
  temperature?: number | null;
  ticketId?: number | null;
  contactId?: number | null;
}): ChatFn => async ({ messages, tools }) => {
  const settings = await GetOpenAISettingsService();
  if (!settings.isActive) throw new AppError("ERR_OPENAI_INACTIVE", 400);
  if (!settings.apiKey) throw new AppError("ERR_OPENAI_NO_API_KEY", 400);

  const model = opts.model || settings.model;
  const temperature =
    opts.temperature !== null && opts.temperature !== undefined
      ? opts.temperature
      : settings.temperature;
  const started = Date.now();

  try {
    const response = await buildClient(settings.apiKey).post(
      "/chat/completions",
      {
        model,
        messages,
        temperature,
        ...(tools && tools.length ? { tools, tool_choice: "auto" } : {})
      }
    );

    const choice = response.data?.choices?.[0]?.message;
    const usage = response.data?.usage || {};

    await CreateOpenAILogService({
      action: "sdr_agent",
      status: "success",
      model: response.data?.model || model,
      response: choice?.content || (choice?.tool_calls ? "[tool_calls]" : ""),
      durationMs: Date.now() - started,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      ticketId: opts.ticketId,
      contactId: opts.contactId,
      metadata: { toolCalls: choice?.tool_calls?.length || 0 }
    });

    return {
      message: choice || { role: "assistant", content: "" },
      model: response.data?.model || model,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      }
    };
  } catch (error) {
    const status = error?.response?.status;
    const message =
      error?.response?.data?.error?.message || error?.message || "OpenAI failed";

    await CreateOpenAILogService({
      action: "sdr_agent",
      status: "error",
      model,
      error: message,
      durationMs: Date.now() - started,
      ticketId: opts.ticketId,
      contactId: opts.contactId
    });

    if (status === 401 || status === 403) throw new AppError("ERR_OPENAI_UNAUTHORIZED", 401);
    if (status === 429) throw new AppError("ERR_OPENAI_RATE_LIMIT", 429);
    if (status === 400) throw new AppError("ERR_OPENAI_BAD_REQUEST", 400);
    if (status === 404) throw new AppError("ERR_OPENAI_MODEL_NOT_FOUND", 404);
    if (status && status >= 500) throw new AppError("ERR_OPENAI_UPSTREAM", 502);
    throw new AppError("ERR_OPENAI_REQUEST_FAILED", 502);
  }
};
