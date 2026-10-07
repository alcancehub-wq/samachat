import {
  decideSdrReply,
  numberAllowed,
  parseAllowedNumbers
} from "../../../../services/SdrAgentServices/policy";
import { renderPrompt } from "../../../../services/SdrAgentServices/promptTemplate";
import {
  buildMetaPrompt,
  cleanGeneratedPrompt,
  looksLikePrompt,
  missingFields,
  PROMPT_TEMPLATE
} from "../../../../services/SdrAgentServices/promptGenerator";

const PROMPT = "<system_instruction>Voce e a Bia.</system_instruction>";
const on = {
  isEnabled: true,
  autoEnableForNewTickets: false,
  testMode: false,
  allowedNumbers: null,
  systemPrompt: PROMPT
};
const ticket = { isGroup: false, userId: null, sdrAgentEnabled: true };
const base = { settings: on, ticket, contactNumber: "5511999998888", fromMe: false, hasText: true };

describe("decideSdrReply (travas de seguranca)", () => {
  it("responde quando tudo esta ligado e a conversa esta marcada para a IA", () => {
    expect(decideSdrReply(base)).toEqual({ respond: true });
  });

  it("NAO responde com o agente desligado, mesmo com a conversa marcada", () => {
    expect(decideSdrReply({ ...base, settings: { ...on, isEnabled: false } })).toEqual({
      respond: false,
      reason: "agente_desligado"
    });
  });

  it("NAO responde sem prompt treinado (nao existe prompt padrao)", () => {
    expect(decideSdrReply({ ...base, settings: { ...on, systemPrompt: null } })).toEqual({
      respond: false,
      reason: "sem_prompt"
    });
    expect(decideSdrReply({ ...base, settings: { ...on, systemPrompt: "   " } }).respond).toBe(false);
  });

  it("nunca responde a mensagem propria, grupo ou sem texto", () => {
    expect(decideSdrReply({ ...base, fromMe: true }).respond).toBe(false);
    expect(decideSdrReply({ ...base, ticket: { ...ticket, isGroup: true } }).respond).toBe(false);
    expect(decideSdrReply({ ...base, hasText: false }).respond).toBe(false);
  });

  it("sai de cena quando um atendente humano assume, mesmo marcado", () => {
    expect(decideSdrReply({ ...base, ticket: { ...ticket, userId: 5 } })).toEqual({
      respond: false,
      reason: "atendente_humano"
    });
  });

  it("conversa sem marcacao so e atendida se a IA atende primeiro (regra automatica)", () => {
    const unmarked = { ...ticket, sdrAgentEnabled: null };
    expect(decideSdrReply({ ...base, ticket: unmarked }).respond).toBe(false);
    expect(
      decideSdrReply({ ...base, ticket: unmarked, settings: { ...on, autoEnableForNewTickets: true } }).respond
    ).toBe(true);
  });

  it("passar para humano na conversa vence a regra automatica", () => {
    expect(
      decideSdrReply({
        ...base,
        ticket: { ...ticket, sdrAgentEnabled: false },
        settings: { ...on, autoEnableForNewTickets: true }
      })
    ).toEqual({ respond: false, reason: "desligado_no_ticket" });
  });
});

describe("modo teste (nao influencia as outras conversas)", () => {
  const test = { ...on, testMode: true, allowedNumbers: "11 99999-8888, 5521988887777" };
  const unmarked = { ...ticket, sdrAgentEnabled: null };

  it("numero da lista e atendido sem precisar marcar a conversa", () => {
    expect(decideSdrReply({ ...base, settings: test, ticket: unmarked }).respond).toBe(true);
  });

  it("numero fora da lista NAO e atendido, mesmo com a IA atendendo primeiro", () => {
    const r = decideSdrReply({
      ...base,
      settings: { ...test, autoEnableForNewTickets: true },
      ticket: unmarked,
      contactNumber: "5531977776666"
    });
    expect(r).toEqual({ respond: false, reason: "modo_teste_numero_nao_listado" });
  });

  it("modo teste ligado com lista vazia nao atende ninguem", () => {
    expect(decideSdrReply({ ...base, settings: { ...test, allowedNumbers: "" }, ticket: unmarked }).respond).toBe(false);
  });

  it("mesmo na lista, humano assumiu ou conversa passada para humano -> nao responde", () => {
    expect(decideSdrReply({ ...base, settings: test, ticket: { ...unmarked, userId: 3 } }).respond).toBe(false);
    expect(decideSdrReply({ ...base, settings: test, ticket: { ...ticket, sdrAgentEnabled: false } }).respond).toBe(false);
  });

  it("modo teste desligado ignora a lista", () => {
    const off = { ...on, testMode: false, allowedNumbers: "5599888877776" };
    expect(decideSdrReply({ ...base, settings: off }).respond).toBe(true);
  });
});

describe("lista de numeros de teste", () => {
  it("normaliza, separa por virgula/ponto e virgula/linha e descarta fragmentos curtos", () => {
    expect(parseAllowedNumbers("(11) 99999-8888; 5521988887777\n+55 31 97777-6666, 11")).toEqual([
      "11999998888",
      "5521988887777",
      "5531977776666"
    ]);
  });

  it("lista vazia nao libera ninguem; numero curto nao passa", () => {
    expect(numberAllowed([], "5511999998888")).toBe(false);
    expect(numberAllowed(["11999998888"], "")).toBe(false);
    expect(numberAllowed(["11999998888"], "5511999998888")).toBe(true);
  });
});

describe("renderPrompt", () => {
  const ctx = {
    now: new Date("2026-10-05T15:30:00Z"), // 12:30 em Sao Paulo, segunda-feira
    timeZone: "America/Sao_Paulo",
    contactName: "Maria",
    contactNumber: "5511999998888",
    companyName: "ARKOM"
  };

  it("preenche data, hora, dia da semana e dados do lead", () => {
    const out = renderPrompt(
      "{{ data_hora }} ({{ dia_semana }}) | {{data}} | {{ hora }} | {{ cliente_nome }} | {{ empresa }}",
      ctx
    );
    expect(out).toBe("05/10/2026 12:30 (segunda-feira) | 05/10/2026 | 12:30 | Maria | ARKOM");
  });

  it("mantem variavel desconhecida para o erro ficar visivel", () => {
    expect(renderPrompt("oi {{ nao_existe }}", ctx)).toBe("oi {{ nao_existe }}");
  });

  it("o template do gerador usa as variaveis de data e elas sao preenchidas", () => {
    expect(PROMPT_TEMPLATE).toContain("{{ data_hora }}");
    const out = renderPrompt(PROMPT_TEMPLATE, ctx);
    expect(out).toContain("05/10/2026 12:30");
    expect(out).not.toContain("{{ data_hora }}");
  });
});

describe("gerador de prompt", () => {
  const form: any = {
    sdr_name: "Bia", role: "SDR", company_name: "ARKOM", paper_type: "consultor amigo",
    personality: "consultiva", tone: "consultivo", prohibited_terms: "girias",
    philosophy_name: "Venda Consultiva", lead_talk_percentage: 80, max_lines: 3,
    products: "- Agente SDR", differentials: "- Metodo The Machine",
    conversion_action: "Agendar reuniao", tools: "agendamento"
  };

  it("exige nome, empresa, produtos e diferenciais", () => {
    expect(missingFields(form)).toEqual([]);
    expect(missingFields({ ...form, products: " ", sdr_name: "" })).toEqual(["sdr_name", "products"]);
  });

  it("o meta-prompt leva o template inteiro e as respostas do usuario", () => {
    const meta = buildMetaPrompt(form);
    expect(meta).toContain("<system_instruction>");
    expect(meta).toContain("- Nome do SDR: Bia");
    expect(meta).toContain("- Produtos/Servicos".replace("Servicos", "Serviços"));
    expect(meta).toContain("- Agente SDR");
    expect(meta).toContain("{{ cliente_nome }}");
  });

  it("limpa cercas de markdown e texto fora do bloco", () => {
    const raw = "Claro! Aqui esta:\n```xml\n<system_instruction>\n" + "x".repeat(600) + "\n</system_instruction>\n```\nEspero que ajude";
    const out = cleanGeneratedPrompt(raw);
    expect(out.startsWith("<system_instruction>")).toBe(true);
    expect(out.endsWith("</system_instruction>")).toBe(true);
    expect(out).not.toContain("```");
    expect(looksLikePrompt(out)).toBe(true);
  });

  it("troca a sintaxe antiga de data pela variavel nova", () => {
    expect(cleanGeneratedPrompt("<system_instruction>{{ DateTime.now().setZone('x').toFormat('y') }}</system_instruction>"))
      .toContain("{{ data_hora }}");
  });

  it("resposta sem o bloco XML nao serve", () => {
    expect(looksLikePrompt("Desculpe, nao consegui gerar.")).toBe(false);
    expect(looksLikePrompt(PROMPT)).toBe(false); // curto demais
  });
});
