import {
  fromAnthropicResponse,
  toAnthropicRequest
} from "../../../../services/AiEngineServices/claudeAdapter";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Ver horarios livres",
      parameters: { type: "object", properties: { date: { type: "string" } } }
    }
  }
];

describe("Claude: conversao do formato da OpenAI", () => {
  it("separa o system e converte as ferramentas", () => {
    const out = toAnthropicRequest(
      [
        { role: "system", content: "Voce e a Bia." },
        { role: "user", content: "oi" }
      ],
      TOOLS
    );
    expect(out.system).toBe("Voce e a Bia.");
    expect(out.messages).toEqual([{ role: "user", content: [{ type: "text", text: "oi" }] }]);
    expect(out.tools).toEqual([
      {
        name: "check_availability",
        description: "Ver horarios livres",
        input_schema: { type: "object", properties: { date: { type: "string" } } }
      }
    ]);
  });

  it("junta mensagens seguidas do mesmo papel (a API exige alternancia)", () => {
    const out = toAnthropicRequest([
      { role: "user", content: "oi" },
      { role: "user", content: "tem horario amanha?" }
    ]);
    expect(out.messages).toHaveLength(1);
    expect(out.messages[0].content).toHaveLength(2);
  });

  it("comeca sempre pelo lead, mesmo se o historico comecar pela IA", () => {
    const out = toAnthropicRequest([{ role: "assistant", content: "Ola!" }]);
    expect(out.messages[0].role).toBe("user");
    expect(out.messages[1].role).toBe("assistant");
  });

  it("converte pedido de ferramenta e o resultado dela", () => {
    const out = toAnthropicRequest([
      { role: "user", content: "tem horario?" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "check_availability", arguments: '{"date":"2026-10-10"}' }
          }
        ]
      },
      { role: "tool", tool_call_id: "call_1", content: '{"slots":["10:00"]}' }
    ]);

    expect(out.messages[1]).toEqual({
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: "call_1",
          name: "check_availability",
          input: { date: "2026-10-10" }
        }
      ]
    });
    expect(out.messages[2]).toEqual({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "call_1", content: '{"slots":["10:00"]}' }]
    });
  });

  it("argumentos quebrados viram objeto vazio, sem derrubar o atendimento", () => {
    const out = toAnthropicRequest([
      { role: "user", content: "x" },
      {
        role: "assistant",
        tool_calls: [{ id: "c", function: { name: "f", arguments: "{quebrado" } }]
      }
    ]);
    expect((out.messages[1].content[0] as any).input).toEqual({});
  });

  it("sem ferramentas nao manda o campo tools", () => {
    expect(toAnthropicRequest([{ role: "user", content: "oi" }]).tools).toBeUndefined();
  });
});

describe("Claude: resposta de volta para o formato da OpenAI", () => {
  it("texto simples", () => {
    const out = fromAnthropicResponse({
      model: "claude-sonnet-5-5",
      content: [{ type: "text", text: "Ola, tudo bem?" }],
      usage: { input_tokens: 10, output_tokens: 5 }
    });
    expect(out.message.content).toBe("Ola, tudo bem?");
    expect(out.message.tool_calls).toBeUndefined();
    expect(out.usage?.totalTokens).toBe(15);
  });

  it("pedido de ferramenta vira tool_calls", () => {
    const out = fromAnthropicResponse({
      content: [
        { type: "text", text: "Vou conferir." },
        { type: "tool_use", id: "toolu_1", name: "check_availability", input: { date: "x" } }
      ]
    });
    expect(out.message.content).toBe("Vou conferir.");
    expect(out.message.tool_calls).toEqual([
      {
        id: "toolu_1",
        type: "function",
        function: { name: "check_availability", arguments: '{"date":"x"}' }
      }
    ]);
  });

  it("resposta vazia nao quebra", () => {
    const out = fromAnthropicResponse({ content: [] });
    expect(out.message.content).toBeNull();
  });
});
