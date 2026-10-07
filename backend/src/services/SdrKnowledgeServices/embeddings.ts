import AppError from "../../errors/AppError";
import GetOpenAISettingsService from "../OpenAISettingsServices/GetOpenAISettingsService";
import buildClient from "../OpenAI/OpenAIClient";

export const EMBEDDING_MODEL = "text-embedding-3-small";
const BATCH_SIZE = 64;

export type EmbedFn = (texts: string[]) => Promise<number[][]>;

const round = (v: number[]): number[] => v.map(x => Math.round(x * 1e6) / 1e6);

// Embeddings pela OpenAI, com a mesma chave/ativacao da tela de OpenAI do chat.
export const createEmbeddings: EmbedFn = async texts => {
  const settings = await GetOpenAISettingsService();
  // A busca da base de conhecimento usa a chave da OpenAI mesmo quando outra IA
  // (Gemini ou Claude) e a que conversa: so exige a chave, nao a ativacao.
  if (!settings.apiKey) throw new AppError("ERR_OPENAI_NO_API_KEY", 400);

  const client = buildClient(settings.apiKey);
  const out: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    try {
      const response = await client.post("/embeddings", {
        model: EMBEDDING_MODEL,
        input: batch
      });
      const rows: { index: number; embedding: number[] }[] = response.data?.data || [];
      rows.sort((a, b) => a.index - b.index).forEach(r => out.push(round(r.embedding)));
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) throw new AppError("ERR_OPENAI_UNAUTHORIZED", 401);
      if (status === 429) throw new AppError("ERR_OPENAI_RATE_LIMIT", 429);
      if (status === 400) throw new AppError("ERR_OPENAI_BAD_REQUEST", 400);
      throw new AppError("ERR_OPENAI_REQUEST_FAILED", 502);
    }
  }

  if (out.length !== texts.length) {
    throw new AppError("ERR_OPENAI_REQUEST_FAILED", 502);
  }
  return out;
};
