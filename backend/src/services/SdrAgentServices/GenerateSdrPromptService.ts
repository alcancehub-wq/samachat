import AppError from "../../errors/AppError";
import CreateOpenAILogService from "../OpenAILogServices/CreateOpenAILogService";
import GetOpenAISettingsService from "../OpenAISettingsServices/GetOpenAISettingsService";
import buildClient from "../OpenAI/OpenAIClient";
import { engineComplete, getActiveEngine } from "../AiEngineServices/engines";
import {
  buildMetaPrompt,
  cleanGeneratedPrompt,
  looksLikePrompt,
  missingFields,
  PromptGeneratorForm
} from "./promptGenerator";
import { getSdrAgentSettings } from "./SdrAgentSettingsService";

const GENERATOR_MODEL = "gpt-4o";

const callModel = async (apiKey: string, model: string, content: string) => {
  const response = await buildClient(apiKey).post(
    "/chat/completions",
    {
      model,
      messages: [{ role: "user", content }],
      temperature: 0.4,
      max_tokens: 4000
    },
    { timeout: 90000 }
  );
  return String(response.data?.choices?.[0]?.message?.content || "");
};

// Gera o prompt mestre a partir das respostas do formulario. Usa a mesma chave
// da OpenAI do chat; o prompt gerado so aparece na tela (nada e salvo aqui).
const GenerateSdrPromptService = async (
  form: PromptGeneratorForm
): Promise<{ prompt: string; model: string }> => {
  if (missingFields(form).length) {
    throw new AppError("ERR_SDR_PROMPT_FIELDS_REQUIRED", 400);
  }

  const agentSettings = await getSdrAgentSettings();
  const engine = await getActiveEngine(agentSettings.aiEngine);
  if (!engine) throw new AppError("ERR_AI_NO_ENGINE", 400);

  // Gemini ou Claude: gera o prompt com a IA que esta ativa.
  if (engine !== "openai") {
    const generated = await engineComplete(buildMetaPrompt(form), {
      action: "sdr_generate_prompt",
      engine,
      maxTokens: 4000,
      temperature: 0.4
    });
    const cleaned = cleanGeneratedPrompt(generated.text);
    if (!looksLikePrompt(cleaned)) {
      throw new AppError("ERR_SDR_PROMPT_GENERATION_FAILED", 502);
    }
    return { prompt: cleaned, model: generated.model };
  }

  const settings = await GetOpenAISettingsService();
  if (!settings.isActive) throw new AppError("ERR_OPENAI_INACTIVE", 400);
  if (!settings.apiKey) throw new AppError("ERR_OPENAI_NO_API_KEY", 400);

  const agent = await getSdrAgentSettings();
  const preferred = agent.model || GENERATOR_MODEL;
  const metaPrompt = buildMetaPrompt(form);
  const started = Date.now();
  let used = preferred;

  try {
    let raw: string;
    try {
      raw = await callModel(settings.apiKey, preferred, metaPrompt);
    } catch (err) {
      // Conta sem acesso ao modelo preferido: tenta o modelo configurado no chat.
      if (err?.response?.status === 404 && settings.model && settings.model !== preferred) {
        used = settings.model;
        raw = await callModel(settings.apiKey, used, metaPrompt);
      } else {
        throw err;
      }
    }

    const prompt = cleanGeneratedPrompt(raw);
    if (!looksLikePrompt(prompt)) {
      throw new AppError("ERR_SDR_PROMPT_GENERATION_FAILED", 502);
    }

    await CreateOpenAILogService({
      action: "sdr_generate_prompt",
      status: "success",
      model: used,
      durationMs: Date.now() - started
    });
    return { prompt, model: used };
  } catch (error) {
    if (error instanceof AppError) throw error;

    const status = error?.response?.status;
    await CreateOpenAILogService({
      action: "sdr_generate_prompt",
      status: "error",
      model: used,
      error: error?.response?.data?.error?.message || error?.message,
      durationMs: Date.now() - started
    });
    if (status === 401 || status === 403) throw new AppError("ERR_OPENAI_UNAUTHORIZED", 401);
    if (status === 429) throw new AppError("ERR_OPENAI_RATE_LIMIT", 429);
    if (status === 404) throw new AppError("ERR_OPENAI_MODEL_NOT_FOUND", 404);
    throw new AppError("ERR_SDR_PROMPT_GENERATION_FAILED", 502);
  }
};

export default GenerateSdrPromptService;
