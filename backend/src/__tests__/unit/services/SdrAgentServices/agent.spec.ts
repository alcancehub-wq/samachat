import AppError from "../../../../errors/AppError";
import { runAgentLoop, ChatFn } from "../../../../services/SdrAgentServices/agentLoop";
import { SdrScheduler } from "../../../../services/SdrAgentServices/scheduler";
import { splitReply, toChatHistory } from "../../../../services/SdrAgentServices/conversation";
import { executeTool } from "../../../../services/SdrAgentServices/tools";

const toolCall = (id: string, name: string, args: object) => ({
  id,
  type: "function",
  function: { name, arguments: JSON.stringify(args) }
});

describe("runAgentLoop", () => {
  it("responde direto quando o modelo nao pede ferramenta", async () => {
    const chat: ChatFn = async () => ({ message: { role: "assistant", content: " Oi, Maria! " } });
    const r = await runAgentLoop({ chat, messages: [], tools: [], runTool: jest.fn(), maxRounds: 3 });
    expect(r.reply).toBe("Oi, Maria!");
    expect(r.toolCalls).toEqual([]);
    expect(r.rounds).toBe(1);
  });

  it("executa a ferramenta, devolve o resultado ao modelo e usa o texto final", async () => {
    const seen: any[] = [];
    const chat: ChatFn = async ({ messages }) => {
      seen.push(messages.map(m => m.role));
      return seen.length === 1
        ? { message: { role: "assistant", content: null, tool_calls: [toolCall("c1", "check_availability", { date: "2026-10-05" })] } }
        : { message: { role: "assistant", content: "Tenho 09:00 e 10:00." }, usage: { totalTokens: 7 } };
    };
    const runTool = jest.fn(async () => ({ available_slots: ["09:00", "10:00"] }));

    const r = await runAgentLoop({ chat, messages: [{ role: "user", content: "quero marcar" }], tools: [{}], runTool, maxRounds: 3 });

    expect(runTool).toHaveBeenCalledWith("check_availability", '{"date":"2026-10-05"}');
    expect(seen[1]).toEqual(["user", "assistant", "tool"]); // o resultado voltou para o modelo
    expect(r.reply).toBe("Tenho 09:00 e 10:00.");
    expect(r.toolCalls).toHaveLength(1);
    expect(r.totalTokens).toBe(7);
  });

  it("limite de rodadas: forca uma resposta final SEM ferramentas", async () => {
    const calls: boolean[] = [];
    const chat: ChatFn = async ({ tools }) => {
      calls.push(Boolean(tools));
      return tools
        ? { message: { role: "assistant", content: null, tool_calls: [toolCall("x", "check_availability", {})] } }
        : { message: { role: "assistant", content: "Vou te passar para a equipe." } };
    };
    const r = await runAgentLoop({ chat, messages: [], tools: [{}], runTool: async () => ({}), maxRounds: 2 });
    expect(calls).toEqual([true, true, false]);
    expect(r.reply).toBe("Vou te passar para a equipe.");
  });

  it("resposta vazia vira texto vazio (quem chama decide nao enviar)", async () => {
    const chat: ChatFn = async () => ({ message: { role: "assistant", content: null } });
    const r = await runAgentLoop({ chat, messages: [], tools: [], runTool: jest.fn(), maxRounds: 2 });
    expect(r.reply).toBe("");
  });
});

describe("SdrScheduler (agrupar mensagens e nao rodar em paralelo)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const flush = async () => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  };

  it("varias mensagens seguidas geram UMA execucao", async () => {
    const runner = jest.fn(async () => undefined);
    const s = new SdrScheduler(runner);
    s.schedule(1, 5);
    jest.advanceTimersByTime(3000);
    s.schedule(1, 5); // chegou outra mensagem: reinicia a espera
    jest.advanceTimersByTime(3000);
    expect(runner).not.toHaveBeenCalled();
    jest.advanceTimersByTime(2000);
    await flush();
    expect(runner).toHaveBeenCalledTimes(1);
    expect(runner).toHaveBeenCalledWith(1);
  });

  it("mensagem nova durante a execucao roda de novo depois, nunca em paralelo", async () => {
    let release: () => void = () => undefined;
    let concurrent = 0;
    let maxConcurrent = 0;
    const runner = jest.fn(
      () =>
        new Promise<void>(resolve => {
          concurrent += 1;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          release = () => {
            concurrent -= 1;
            resolve();
          };
        })
    );
    const s = new SdrScheduler(runner);

    s.schedule(7, 0);
    jest.advanceTimersByTime(0);
    await flush();
    s.schedule(7, 0); // chega mensagem enquanto o agente ainda roda
    jest.advanceTimersByTime(0);
    await flush();
    expect(runner).toHaveBeenCalledTimes(1);

    release();
    await flush();
    expect(runner).toHaveBeenCalledTimes(2);
    release();
    await flush();
    expect(maxConcurrent).toBe(1);
  });

  it("erro no agente nao trava o ticket: a proxima mensagem roda normalmente", async () => {
    const runner = jest.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(undefined);
    const s = new SdrScheduler(runner);
    s.schedule(3, 0);
    jest.advanceTimersByTime(0);
    await flush();
    s.schedule(3, 0);
    jest.advanceTimersByTime(0);
    await flush();
    expect(runner).toHaveBeenCalledTimes(2);
    expect(s.pending()).toBe(0);
  });

  it("tickets diferentes nao se atrapalham", async () => {
    const runner = jest.fn(async () => undefined);
    const s = new SdrScheduler(runner);
    s.schedule(1, 1);
    s.schedule(2, 1);
    jest.advanceTimersByTime(1000);
    await flush();
    expect(runner).toHaveBeenCalledTimes(2);
  });
});

describe("conversation helpers", () => {
  it("histórico: lead = user, nossas mensagens = assistant, midia vira marca, vazio some", () => {
    const out = toChatHistory([
      { body: "oi", fromMe: false, mediaType: "chat" },
      { body: "Oi! Tudo bem?", fromMe: true, mediaType: "chat" },
      { body: "audio.ogg", fromMe: false, mediaType: "audio" },
      { body: "   ", fromMe: false, mediaType: "chat" }
    ]);
    expect(out).toEqual([
      { role: "user", content: "oi" },
      { role: "assistant", content: "Oi! Tudo bem?" },
      { role: "user", content: "[o lead enviou audio; o conteudo nao pode ser lido]" }
    ]);
  });

  it("divide a resposta em ate 3 mensagens por paragrafo", () => {
    expect(splitReply("a\n\nb")).toEqual(["a", "b"]);
    expect(splitReply("a\n\nb\n\nc\n\nd\n\ne")).toEqual(["a", "b", "c\n\nd\n\ne"]);
    expect(splitReply("  \n\n ")).toEqual([]);
  });
});

describe("executeTool (BIA usa os servicos do CRM, sem agenda propria)", () => {
  const NOW = new Date("2026-10-05T12:00:00Z");
  const closer = { name: "Ana", email: "ana@x.com" };

  const crmApi = (over: any = {}): any => ({
    getAvailability: jest.fn(async () => ({
      state: "available",
      receipt: { availableClosers: [closer] }
    })),
    scheduleMeeting: jest.fn(async () => ({
      state: "scheduled",
      receipt: { meetingId: "m-1", closerName: "Ana" }
    })),
    handoffCloser: jest.fn(async () => ({ state: "handed_off" })),
    advanceStage: jest.fn(async () => ({ state: "moved" })),
    ...over
  });

  const ctx = (api: any, extra: any = {}): any => ({
    contactId: 10,
    ticketId: 20,
    onTransfer: jest.fn(),
    crm: {
      integrationId: 1,
      pipelineName: "SDR",
      currentStage: "Novo",
      persistStage: jest.fn(async () => undefined),
      api
    },
    ...extra
  });

  it("check_availability consulta o CRM e lista os closers livres", async () => {
    const api = crmApi();
    const r: any = await executeTool(
      "check_availability",
      '{"date":"2026-10-06","time":"14:00"}',
      ctx(api),
      NOW
    );
    expect(api.getAvailability).toHaveBeenCalledWith(
      expect.objectContaining({ localIntegrationId: 1 })
    );
    expect(r.available).toBe(true);
    expect(r.available_closers).toEqual(["Ana"]);
  });

  it("create_appointment agenda no CRM e ja faz o handoff para o closer", async () => {
    const api = crmApi();
    const r: any = await executeTool(
      "create_appointment",
      { title: "Apresentacao", date: "2026-10-06", time: "14:00" },
      ctx(api),
      NOW
    );
    expect(api.scheduleMeeting).toHaveBeenCalledWith(
      expect.objectContaining({ sourceContactId: 10, closerEmail: "ana@x.com" })
    );
    expect(api.handoffCloser).toHaveBeenCalledWith(
      expect.objectContaining({ meetingId: "m-1", sourceContactId: 10 })
    );
    expect(r.ok).toBe(true);
    expect(r.handoff_done).toBe(true);
  });

  it("reuniao criada mas handoff falha: nao declara sucesso e transfere para humano", async () => {
    const api = crmApi({
      handoffCloser: jest.fn(async () => ({
        state: "reconciliation_required",
        code: "handoff_transport_pending"
      }))
    });
    const c = ctx(api);

    const r: any = await executeTool(
      "create_appointment",
      { title: "Apresentacao", date: "2026-10-06", time: "14:00" },
      c,
      NOW
    );

    expect(api.scheduleMeeting).toHaveBeenCalled();
    expect(api.handoffCloser).toHaveBeenCalled();
    expect(r.error).toBe("handoff_pending");
    expect(r.meeting_created).toBe(true);
    expect(r.handoff_done).toBe(false);
    expect(c.onTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "duvida_sem_resposta"
      })
    );
  });

  it("sem closer livre nao agenda", async () => {
    const api = crmApi({
      getAvailability: jest.fn(async () => ({
        state: "available",
        receipt: { availableClosers: [] }
      }))
    });
    const r: any = await executeTool(
      "create_appointment",
      { title: "x", date: "2026-10-06", time: "14:00" },
      ctx(api),
      NOW
    );
    expect(r.error).toBe("no_closer_available");
    expect(api.scheduleMeeting).not.toHaveBeenCalled();
  });

  it("horario no passado e recusado antes de chamar o CRM", async () => {
    const api = crmApi();
    const r: any = await executeTool(
      "check_availability",
      { date: "2026-10-04", time: "10:00" },
      ctx(api),
      NOW
    );
    expect(r.error).toBe("date_in_past");
    expect(api.getAvailability).not.toHaveBeenCalled();
  });

  it("CRM desligado devolve crm_unavailable (o modelo deve transferir)", async () => {
    const r: any = await executeTool(
      "check_availability",
      { date: "2026-10-06", time: "14:00" },
      { contactId: 10, onTransfer: jest.fn() },
      NOW
    );
    expect(r.error).toBe("crm_unavailable");
  });

  it("advance_stage so grava a etapa depois que o CRM confirma", async () => {
    const c = ctx(crmApi());
    const ok: any = await executeTool("advance_stage", { to_stage: "Qualificado" }, c, NOW);
    expect(ok).toEqual({ ok: true, stage: "Qualificado" });
    expect(c.crm.persistStage).toHaveBeenCalledWith("Qualificado");

    const c2 = ctx(
      crmApi({ advanceStage: jest.fn(async () => ({ state: "rejected", code: "x" })) })
    );
    const r: any = await executeTool("advance_stage", { to_stage: "Fechado" }, c2, NOW);
    expect(r.error).toBe("x");
    expect(c2.crm.persistStage).not.toHaveBeenCalled();
  });

  it("erro de negocio vira mensagem para o modelo; erro inesperado sobe", async () => {
    const biz = crmApi({
      getAvailability: jest.fn(async () => {
        throw new AppError("ERR_CRM_X", 409);
      })
    });
    const r: any = await executeTool(
      "check_availability",
      { date: "2026-10-06", time: "14:00" },
      ctx(biz),
      NOW
    );
    expect(r.error).toBe("ERR_CRM_X");

    const boom = crmApi({
      getAvailability: jest.fn(async () => {
        throw new Error("banco caiu");
      })
    });
    await expect(
      executeTool("check_availability", { date: "2026-10-06", time: "14:00" }, ctx(boom), NOW)
    ).rejects.toThrow("banco caiu");
  });

  it("transfer_to_human aciona o callback com motivo e resumo", async () => {
    const onTransfer = jest.fn();
    await executeTool(
      "transfer_to_human",
      { reason: "reclamacao", summary: "irritado" },
      ctx(crmApi(), { onTransfer }),
      NOW
    );
    expect(onTransfer).toHaveBeenCalledWith({ reason: "reclamacao", summary: "irritado" });
  });

  it("argumentos invalidos e ferramenta desconhecida nao explodem", async () => {
    const bad: any = await executeTool("check_availability", "{nao e json", ctx(crmApi()), NOW);
    expect(bad.error).toBe("invalid_arguments");
    const unknown: any = await executeTool("apagar_tudo", {}, ctx(crmApi()), NOW);
    expect(unknown.error).toBe("unknown_tool");
  });
});
