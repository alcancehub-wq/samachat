import { splitIntoChunks } from "../../../../services/SdrKnowledgeServices/chunker";
import { cosine, topK, norm } from "../../../../services/SdrKnowledgeServices/similarity";
import {
  formatKnowledgeContext,
  retrieveForConversation
} from "../../../../services/SdrKnowledgeServices/KnowledgeService";

describe("splitIntoChunks", () => {
  it("texto vazio ou so espacos -> nenhum trecho", () => {
    expect(splitIntoChunks("")).toEqual([]);
    expect(splitIntoChunks("  \n\n  ")).toEqual([]);
  });

  it("texto curto fica em um trecho so", () => {
    expect(splitIntoChunks("Plano Start custa 997 por mes.")).toEqual(["Plano Start custa 997 por mes."]);
  });

  it("junta paragrafos ate encher e respeita o limite", () => {
    const paragraphs = Array.from({ length: 12 }, (_, i) => `Paragrafo ${i} ` + "x".repeat(150));
    const chunks = splitIntoChunks(paragraphs.join("\n\n"), 500, 0);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(c => expect(c.length).toBeLessThanOrEqual(500));
    // nada se perde
    expect(chunks.join("\n\n")).toContain("Paragrafo 11");
  });

  it("paragrafo gigante e fatiado sem passar do limite", () => {
    const chunks = splitIntoChunks("a".repeat(2500), 900, 0);
    expect(chunks.length).toBe(3);
    chunks.forEach(c => expect(c.length).toBeLessThanOrEqual(900));
  });

  it("sobreposicao: o trecho seguinte recomeca com o fim do anterior", () => {
    const first = "Inicio " + "alfa ".repeat(60) + "FINAL-DO-PRIMEIRO";
    const second = "Segundo bloco " + "beta ".repeat(60);
    const chunks = splitIntoChunks(`${first}\n\n${second}`, 400, 60);
    expect(chunks.length).toBe(2);
    expect(chunks[1]).toContain("FINAL-DO-PRIMEIRO");
    expect(chunks[1]).toContain("Segundo bloco");
  });
});

describe("similaridade", () => {
  it("cosseno: iguais = 1, ortogonais = 0, oposto = -1, vetor zerado = 0", () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosine([1, 0], [-1, 0])).toBeCloseTo(-1);
    expect(cosine([0, 0], [1, 1])).toBe(0);
    expect(cosine([1, 2], [1, 2, 3])).toBe(0); // tamanhos diferentes
  });

  it("topK ordena do mais parecido, corta pelo minimo e limita a quantidade", () => {
    const mk = (id: string, v: number[]) => ({ id, vector: v, norm: norm(v) });
    const items = [mk("longe", [0, 1]), mk("perto", [1, 0.1]), mk("igual", [1, 0]), mk("meio", [1, 1])];
    const r = topK([1, 0], items, 2, 0.5);
    expect(r.map(x => x.item.id)).toEqual(["igual", "perto"]);
    expect(topK([1, 0], items, 10, 0.999).map(x => x.item.id)).toEqual(["igual"]);
  });
});

describe("contexto para o prompt", () => {
  const hit = { fileId: 1, fileName: "precos.txt", category: "Preços e planos", content: "Plano Start: R$ 997/mes", score: 0.61 };

  it("sem trechos, nao injeta nada", () => {
    expect(formatKnowledgeContext([])).toBe("");
  });

  it("formata os trechos com a fonte e a instrucao de nao inventar", () => {
    const out = formatKnowledgeContext([hit]);
    expect(out).toContain("<knowledge_context>");
    expect(out).toContain("[1] (fonte: precos.txt, categoria: Preços e planos)");
    expect(out).toContain("Plano Start: R$ 997/mes");
    expect(out).toMatch(/Nao invente/);
  });

  it("busca com as ultimas 2 falas do lead", async () => {
    const search = jest.fn(async () => [hit]);
    const r = await retrieveForConversation(["oi", "quanto custa?", "e o plano start?"], search as any);
    expect(search).toHaveBeenCalledWith("quanto custa?\ne o plano start?");
    expect(r.sources).toEqual([{ fileName: "precos.txt", score: 0.61 }]);
    expect(r.text).toContain("Plano Start");
  });

  it("falha na busca NAO derruba a resposta: segue sem contexto", async () => {
    const search = jest.fn(async () => {
      throw new Error("OpenAI fora do ar");
    });
    const r = await retrieveForConversation(["quanto custa?"], search as any);
    expect(r).toEqual({ text: "", sources: [] });
  });
});
