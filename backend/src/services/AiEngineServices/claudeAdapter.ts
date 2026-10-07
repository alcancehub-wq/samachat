import { ChatMessage, ChatResult } from "../SdrAgentServices/agentLoop";

// Claude (Anthropic) usa a API "Messages", que e diferente do formato da OpenAI.
// O agente fala o formato da OpenAI (mensagens + tool_calls); aqui convertemos
// nos dois sentidos. Funcoes puras: faceis de testar sem chamar a rede.

type Block = Record<string, any>;

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: Block[];
}

export interface AnthropicRequestParts {
  system?: string;
  messages: AnthropicMessage[];
  tools?: Block[];
}

const text = (value: unknown): string => String(value ?? "").trim();

export const toAnthropicRequest = (
  messages: ChatMessage[],
  tools?: any[]
): AnthropicRequestParts => {
  const system = messages
    .filter(m => m.role === "system")
    .map(m => text(m.content))
    .filter(Boolean)
    .join("\n\n");

  const out: AnthropicMessage[] = [];
  // Mensagens seguidas do mesmo papel viram uma so (a API exige alternancia).
  const push = (role: "user" | "assistant", blocks: Block[]): void => {
    if (blocks.length === 0) return;
    const last = out[out.length - 1];
    if (last && last.role === role) {
      last.content = [...last.content, ...blocks];
    } else {
      out.push({ role, content: blocks });
    }
  };

  for (const m of messages) {
    if (m.role === "system") continue;

    if (m.role === "user") {
      const t = text(m.content);
      if (t) push("user", [{ type: "text", text: t }]);
    } else if (m.role === "assistant") {
      const blocks: Block[] = [];
      const t = text(m.content);
      if (t) blocks.push({ type: "text", text: t });
      for (const call of m.tool_calls || []) {
        let input: Record<string, unknown> = {};
        try {
          input = JSON.parse(call.function?.arguments || "{}");
        } catch (err) {
          input = {};
        }
        blocks.push({
          type: "tool_use",
          id: call.id,
          name: call.function?.name,
          input
        });
      }
      push("assistant", blocks);
    } else if (m.role === "tool") {
      push("user", [
        {
          type: "tool_result",
          tool_use_id: m.tool_call_id,
          content: text(m.content) || "{}"
        }
      ]);
    }
  }

  // A conversa precisa comecar pelo lead.
  if (out.length === 0 || out[0].role !== "user") {
    out.unshift({
      role: "user",
      content: [{ type: "text", text: "(inicio da conversa)" }]
    });
  }

  const anthropicTools =
    tools && tools.length
      ? tools.map((t: any) => ({
          name: t.function.name,
          description: t.function.description,
          input_schema: t.function.parameters || { type: "object", properties: {} }
        }))
      : undefined;

  return { system: system || undefined, messages: out, tools: anthropicTools };
};

export const fromAnthropicResponse = (data: any): ChatResult => {
  const blocks: Block[] = Array.isArray(data?.content) ? data.content : [];

  const content = blocks
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n")
    .trim();

  const toolCalls = blocks
    .filter(b => b.type === "tool_use")
    .map(b => ({
      id: b.id,
      type: "function",
      function: { name: b.name, arguments: JSON.stringify(b.input || {}) }
    }));

  const input = Number(data?.usage?.input_tokens) || 0;
  const output = Number(data?.usage?.output_tokens) || 0;

  return {
    message: {
      role: "assistant",
      content: content || null,
      ...(toolCalls.length ? { tool_calls: toolCalls } : {})
    },
    model: data?.model,
    usage: {
      promptTokens: input,
      completionTokens: output,
      totalTokens: input + output
    }
  };
};
