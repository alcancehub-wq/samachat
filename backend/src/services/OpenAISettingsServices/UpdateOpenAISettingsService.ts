import OpenAISetting from "../../models/OpenAISetting";
import GetOpenAISettingsService from "./GetOpenAISettingsService";

interface Request {
  apiKey?: string | null;
  isActive?: boolean;
  model?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  systemPrompt?: string | null;
  suggestionPrompt?: string | null;
  rewritePrompt?: string | null;
  summaryPrompt?: string | null;
  classificationPrompt?: string | null;
  autoReplyEnabled?: boolean;
  autoReplyPrompt?: string | null;
  maxRequestsPerDay?: number | null;
  maxRequestsPerHour?: number | null;
}

const UpdateOpenAISettingsService = async (
  data: Request
): Promise<OpenAISetting> => {
  const settings = await GetOpenAISettingsService();

  const updatePayload: Partial<OpenAISetting> = {
    isActive: data.isActive ?? settings.isActive,
    model: data.model ?? settings.model,
    temperature: data.temperature ?? settings.temperature,
    topP: data.topP ?? settings.topP,
    maxTokens: data.maxTokens ?? settings.maxTokens,
    presencePenalty: data.presencePenalty ?? settings.presencePenalty,
    frequencyPenalty: data.frequencyPenalty ?? settings.frequencyPenalty,
    systemPrompt: data.systemPrompt ?? settings.systemPrompt,
    suggestionPrompt: data.suggestionPrompt ?? settings.suggestionPrompt,
    rewritePrompt: data.rewritePrompt ?? settings.rewritePrompt,
    summaryPrompt: data.summaryPrompt ?? settings.summaryPrompt,
    classificationPrompt: data.classificationPrompt ?? settings.classificationPrompt,
    autoReplyEnabled: data.autoReplyEnabled ?? settings.autoReplyEnabled,
    autoReplyPrompt: data.autoReplyPrompt ?? settings.autoReplyPrompt,
    maxRequestsPerDay:
      data.maxRequestsPerDay !== undefined
        ? data.maxRequestsPerDay
        : settings.maxRequestsPerDay,
    maxRequestsPerHour:
      data.maxRequestsPerHour !== undefined
        ? data.maxRequestsPerHour
        : settings.maxRequestsPerHour
  };

  if (data.apiKey !== undefined) {
    updatePayload.apiKey = data.apiKey || null;
  }

  await settings.update(updatePayload);

  return settings;
};

export default UpdateOpenAISettingsService;
