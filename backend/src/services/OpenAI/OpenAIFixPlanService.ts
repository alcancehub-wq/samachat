import OpenAI from "openai";

interface Request {
  module: string;
  code?: string | null;
  userId?: number | null;
}

interface FixPlanResponse {
  priorities: string[];
  summary: string;
  next_step: string;
}

const DEFAULT_RESPONSE: FixPlanResponse = {
  priorities: [
    "criar trigger central de webhooks",
    "chamar trigger nos eventos create/update/delete",
    "persistir logs em WebhookLog"
  ],
  summary: "Webhook existe em CRUD, mas falta disparo automático por evento.",
  next_step: "implementar TriggerWebhooksService"
};

const extractJson = (value: string): FixPlanResponse | null => {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(value.slice(start, end + 1));
    return parsed as FixPlanResponse;
  } catch (err) {
    return null;
  }
};

const normalizeArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(item => String(item));
};

const normalizeResponse = (value: FixPlanResponse | null): FixPlanResponse => {
  if (!value || !Array.isArray(value.priorities)) {
    return DEFAULT_RESPONSE;
  }

  const priorities = normalizeArray(value.priorities);
  const summary = String(value.summary || "").trim();
  const nextStep = String(value.next_step || "").trim();

  if (priorities.length === 0 || !summary || !nextStep) {
    return DEFAULT_RESPONSE;
  }

  return {
    priorities,
    summary,
    next_step: nextStep
  };
};

const OpenAIFixPlanService = async ({ module, code, userId }: Request): Promise<FixPlanResponse> => {
  const apiKey = process.env.OPENAI_API_KEY || "";
  console.log("FIXPLAN KEY:", apiKey ? "OK" : "MISSING");

  const client = new OpenAI({ apiKey });

  const systemPrompt =
    "You are a senior backend engineer. Respond ONLY with JSON in the exact schema: " +
    "{ \"priorities\": [string], \"summary\": string, \"next_step\": string }." +
    "\nDo not include explanations outside JSON.";

  const userPromptParts = [
    `Module: ${module}`,
    "Provide a concise fix plan with 3-6 priorities.",
    code ? `Code snippet:\n${code}` : "Code snippet: (not provided)"
  ];

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPromptParts.join("\n\n") }
  ];

  const payload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: "gpt-4o-mini",
    messages,
    max_tokens: 220,
    temperature: 0,
    stream: false
  };

  const response = await client.chat.completions.create(payload);
  const content = response.choices?.[0]?.message?.content || "";
  const parsed = extractJson(content);
  return normalizeResponse(parsed);
};

export default OpenAIFixPlanService;
