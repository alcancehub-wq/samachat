import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import GetOpenAISettingsService from "../OpenAISettingsServices/GetOpenAISettingsService";
import CreateOpenAILogService from "../OpenAILogServices/CreateOpenAILogService";
import OpenAILog from "../../models/OpenAILog";
import buildClient from "./OpenAIClient";
import BuildChatPromptService from "./BuildChatPromptService";

interface Request {
  action: string;
  userPrompt: string;
  ticketId?: number | null;
  contactId?: number | null;
  userId?: number | null;
  overrideModel?: string;
  systemPrompt?: string | null;
}

interface Response {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

const assertLimits = async (
  userId: number | null | undefined,
  maxRequestsPerDay?: number | null,
  maxRequestsPerHour?: number | null
): Promise<void> => {
  if (!maxRequestsPerDay && !maxRequestsPerHour) {
    return;
  }

  const now = new Date();
  const where: any = {};

  if (userId) {
    where.userId = userId;
  }

  if (maxRequestsPerHour) {
    const hourStart = new Date(now);
    hourStart.setMinutes(0, 0, 0);

    const hourCount = await OpenAILog.count({
      where: {
        ...where,
        createdAt: { [Op.gte]: hourStart }
      }
    });

    if (hourCount >= maxRequestsPerHour) {
      throw new AppError("ERR_OPENAI_LIMIT_HOUR", 429);
    }
  }

  if (maxRequestsPerDay) {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const dayCount = await OpenAILog.count({
      where: {
        ...where,
        createdAt: { [Op.gte]: dayStart }
      }
    });

    if (dayCount >= maxRequestsPerDay) {
      throw new AppError("ERR_OPENAI_LIMIT_DAY", 429);
    }
  }
};

const RunOpenAICompletionService = async ({
  action,
  userPrompt,
  ticketId,
  contactId,
  userId,
  overrideModel,
  systemPrompt
}: Request): Promise<Response> => {
  const settings = await GetOpenAISettingsService();

  if (!settings.isActive) {
    throw new AppError("ERR_OPENAI_INACTIVE", 400);
  }

  if (!settings.apiKey) {
    throw new AppError("ERR_OPENAI_NO_API_KEY", 400);
  }

  await assertLimits(
    userId || null,
    settings.maxRequestsPerDay,
    settings.maxRequestsPerHour
  );

  const startTime = Date.now();
  const client = buildClient(settings.apiKey);

  const messages = BuildChatPromptService({
    systemPrompt: systemPrompt ?? settings.systemPrompt,
    userPrompt
  });

  try {
    const response = await client.post("/chat/completions", {
      model: overrideModel || settings.model,
      messages,
      temperature: settings.temperature,
      top_p: settings.topP,
      max_tokens: settings.maxTokens,
      presence_penalty: settings.presencePenalty,
      frequency_penalty: settings.frequencyPenalty
    });

    const content = response.data?.choices?.[0]?.message?.content || "";
    const usage = response.data?.usage || {};

    await CreateOpenAILogService({
      action,
      status: "success",
      model: response.data?.model || settings.model,
      prompt: userPrompt,
      response: content,
      durationMs: Date.now() - startTime,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      ticketId: ticketId || null,
      contactId: contactId || null,
      userId: userId || null,
      metadata: { action }
    });

    return {
      content,
      model: response.data?.model || settings.model,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      }
    };
  } catch (error) {
    const status = error?.response?.status;
    const responseMessage =
      error?.response?.data?.error?.message || error?.message || "OpenAI request failed";

    await CreateOpenAILogService({
      action,
      status: "error",
      model: overrideModel || settings.model,
      prompt: userPrompt,
      error: responseMessage,
      durationMs: Date.now() - startTime,
      ticketId: ticketId || null,
      contactId: contactId || null,
      userId: userId || null,
      metadata: { action }
    });

    if (status === 401 || status === 403) {
      throw new AppError("ERR_OPENAI_UNAUTHORIZED", 401);
    }

    if (status === 429) {
      throw new AppError("ERR_OPENAI_RATE_LIMIT", 429);
    }

    if (status === 400) {
      throw new AppError("ERR_OPENAI_BAD_REQUEST", 400);
    }

    if (status === 404) {
      throw new AppError("ERR_OPENAI_MODEL_NOT_FOUND", 404);
    }

    if (status && status >= 500) {
      throw new AppError("ERR_OPENAI_UPSTREAM", 502);
    }

    throw new AppError("ERR_OPENAI_REQUEST_FAILED", 502);
  }
};

export default RunOpenAICompletionService;
