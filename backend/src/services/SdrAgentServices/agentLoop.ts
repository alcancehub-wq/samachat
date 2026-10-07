export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface ChatResult {
  message: ChatMessage;
  model?: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

// `tools` ausente = o modelo nao pode chamar ferramentas (resposta final).
export type ChatFn = (params: {
  messages: ChatMessage[];
  tools?: unknown[];
}) => Promise<ChatResult>;

export type ToolRunner = (
  name: string,
  args: string
) => Promise<Record<string, unknown>>;

export interface ToolCallRecord {
  name: string;
  args: string;
  result: Record<string, unknown>;
}

export interface AgentLoopResult {
  reply: string;
  toolCalls: ToolCallRecord[];
  rounds: number;
  totalTokens: number;
}

// Laco do agente: o modelo responde ou pede ferramentas; executamos e devolvemos
// o resultado ate ele produzir texto. Limite de rodadas evita laco infinito: ao
// estourar, forca uma resposta final SEM ferramentas.
export const runAgentLoop = async (input: {
  chat: ChatFn;
  messages: ChatMessage[];
  tools: unknown[];
  runTool: ToolRunner;
  maxRounds: number;
}): Promise<AgentLoopResult> => {
  const messages = [...input.messages];
  const toolCalls: ToolCallRecord[] = [];
  let totalTokens = 0;

  for (let round = 1; round <= input.maxRounds; round += 1) {
    const res = await input.chat({ messages, tools: input.tools });
    totalTokens += res.usage?.totalTokens || 0;
    const calls = res.message.tool_calls || [];

    if (calls.length === 0) {
      return {
        reply: String(res.message.content || "").trim(),
        toolCalls,
        rounds: round,
        totalTokens
      };
    }

    messages.push({
      role: "assistant",
      content: res.message.content || null,
      tool_calls: calls
    });

    for (const call of calls) {
      const args = call.function?.arguments ?? "{}";
      const result = await input.runTool(call.function?.name, args);
      toolCalls.push({ name: call.function?.name, args, result });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result)
      });
    }
  }

  const final = await input.chat({ messages });
  totalTokens += final.usage?.totalTokens || 0;
  return {
    reply: String(final.message.content || "").trim(),
    toolCalls,
    rounds: input.maxRounds + 1,
    totalTokens
  };
};
