import AppError from "../../errors/AppError";
import sequelize from "../../database";
import SdrKnowledgeChunk from "../../models/SdrKnowledgeChunk";
import SdrKnowledgeFile from "../../models/SdrKnowledgeFile";
import { splitIntoChunks } from "./chunker";
import { createEmbeddings, EmbedFn } from "./embeddings";
import { norm, topK } from "./similarity";

export const MAX_DOCUMENT_CHARS = 90000;
const MAX_CHUNKS_PER_DOCUMENT = 300;
export const DEFAULT_TOP_K = 4;
// text-embedding-3-small: trechos realmente relacionados ficam em geral acima
// de ~0.3; abaixo disso e ruido e e melhor nao injetar nada.
export const DEFAULT_MIN_SCORE = 0.28;

interface CachedChunk {
  id: number;
  fileId: number;
  fileName: string;
  category: string;
  content: string;
  vector: Float32Array;
  norm: number;
}

// Todos os trechos em memoria (a base de um agente de vendas e pequena). Zerado
// sempre que a base muda.
let cache: CachedChunk[] | null = null;
export const invalidateKnowledgeCache = (): void => {
  cache = null;
};

const loadCache = async (): Promise<CachedChunk[]> => {
  if (cache) return cache;
  const rows = await SdrKnowledgeChunk.findAll({
    include: [{ model: SdrKnowledgeFile, attributes: ["id", "name", "category"] }],
    order: [["fileId", "ASC"], ["position", "ASC"]]
  });
  cache = rows.map(r => {
    const vector = Float32Array.from(JSON.parse(r.embedding));
    return {
      id: r.id,
      fileId: r.fileId,
      fileName: r.file ? r.file.name : "",
      category: r.file ? r.file.category : "",
      content: r.content,
      vector,
      norm: norm(vector)
    };
  });
  return cache;
};

export const listKnowledgeFiles = (): Promise<SdrKnowledgeFile[]> =>
  SdrKnowledgeFile.findAll({ order: [["createdAt", "DESC"]] }) as unknown as Promise<
    SdrKnowledgeFile[]
  >;

export const addDocument = async (
  input: { name: string; content: string; category?: string },
  embed: EmbedFn = createEmbeddings
): Promise<SdrKnowledgeFile> => {
  const name = String(input.name || "").trim();
  const content = String(input.content || "").trim();
  const category = String(input.category || "").trim().slice(0, 80) || "Outros";
  if (!name) throw new AppError("ERR_SDR_KB_NAME_REQUIRED", 400);
  if (!content) throw new AppError("ERR_SDR_KB_EMPTY", 400);
  if (content.length > MAX_DOCUMENT_CHARS) {
    throw new AppError("ERR_SDR_KB_TOO_LARGE", 413);
  }

  const chunks = splitIntoChunks(content);
  if (chunks.length > MAX_CHUNKS_PER_DOCUMENT) {
    throw new AppError("ERR_SDR_KB_TOO_LARGE", 413);
  }

  // Embeddings ANTES de gravar: se a OpenAI falhar, nada fica pela metade.
  const vectors = await embed(chunks);

  const file = await sequelize.transaction(async transaction => {
    const created = await SdrKnowledgeFile.create(
      { name, category, charCount: content.length, chunkCount: chunks.length } as any,
      { transaction }
    );
    await SdrKnowledgeChunk.bulkCreate(
      chunks.map((text, position) => ({
        fileId: created.id,
        position,
        content: text,
        embedding: JSON.stringify(vectors[position])
      })) as any,
      { transaction }
    );
    return created;
  });

  invalidateKnowledgeCache();
  return file;
};

export const removeDocument = async (id: number): Promise<void> => {
  const file = await SdrKnowledgeFile.findByPk(id);
  if (!file) throw new AppError("ERR_SDR_KB_NOT_FOUND", 404);
  await file.destroy(); // os trechos saem junto (ON DELETE CASCADE)
  invalidateKnowledgeCache();
};

export interface KnowledgeHit {
  fileId: number;
  fileName: string;
  category: string;
  content: string;
  score: number;
}

export const searchKnowledge = async (
  query: string,
  opts: { k?: number; minScore?: number } = {},
  embed: EmbedFn = createEmbeddings
): Promise<KnowledgeHit[]> => {
  const text = String(query || "").trim();
  if (!text) return [];

  const chunks = await loadCache();
  if (chunks.length === 0) return []; // base vazia: nem chama a OpenAI

  const [vector] = await embed([text]);
  return topK(
    vector,
    chunks,
    opts.k || DEFAULT_TOP_K,
    opts.minScore === undefined ? DEFAULT_MIN_SCORE : opts.minScore
  ).map(({ item, score }) => ({
    fileId: item.fileId,
    fileName: item.fileName,
    category: item.category,
    content: item.content,
    score: Math.round(score * 1000) / 1000
  }));
};

// Bloco de contexto que vai junto do prompt do agente.
export const formatKnowledgeContext = (hits: KnowledgeHit[]): string => {
  if (hits.length === 0) return "";
  const body = hits
    .map((h, i) => `[${i + 1}] (fonte: ${h.fileName}, categoria: ${h.category})\n${h.content}`)
    .join("\n\n");
  return (
    "<knowledge_context>\n" +
    "Trechos da base de conhecimento da empresa, relevantes para a ultima mensagem do lead. " +
    "Use SOMENTE se ajudarem a responder. Nao invente nada alem do que esta aqui e nao " +
    "mencione que existe uma base de conhecimento.\n\n" +
    `${body}\n` +
    "</knowledge_context>"
  );
};

// Busca para uma conversa: usa as ultimas falas do lead como pergunta. Falha
// na busca NUNCA derruba a resposta do agente: ele segue sem o contexto.
export const retrieveForConversation = async (
  leadTexts: string[],
  search: typeof searchKnowledge = searchKnowledge
): Promise<{ text: string; sources: { fileName: string; score: number }[] }> => {
  try {
    const query = leadTexts.slice(-2).join("\n").slice(-600);
    const hits = await search(query);
    return {
      text: formatKnowledgeContext(hits),
      sources: hits.map(h => ({ fileName: h.fileName, score: h.score }))
    };
  } catch (err) {
    return { text: "", sources: [] };
  }
};
