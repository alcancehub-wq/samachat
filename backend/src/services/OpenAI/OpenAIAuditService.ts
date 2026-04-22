import OpenAI from "openai";

interface Request {
  module: string;
  code?: string | null;
  userId?: number | null;
}

interface AuditResponse {
  classification: "REAL" | "PARCIAL" | "FAKE" | "QUEBRADO";
  problems: string[];
  missing: string[];
  suggestions: string[];
}

const DEFAULT_RESPONSE: AuditResponse = {
  classification: "PARCIAL",
  problems: [],
  missing: [],
  suggestions: []
};

const extractJson = (value: string): AuditResponse | null => {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(value.slice(start, end + 1));
    return parsed as AuditResponse;
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

const normalizeResponse = (value: AuditResponse | null, raw: string): AuditResponse => {
  if (!value) {
    return {
      ...DEFAULT_RESPONSE,
      problems: ["Invalid JSON response from OpenAI."],
      suggestions: ["Check OpenAI prompt or model response formatting."]
    };
  }

  return {
    classification: value.classification || "PARCIAL",
    problems: normalizeArray(value.problems),
    missing: normalizeArray(value.missing),
    suggestions: normalizeArray(value.suggestions)
  };
};

const OpenAIAuditService = async ({ module, code }: Request): Promise<AuditResponse> => {
  const apiKey = process.env.OPENAI_API_KEY || "";
  console.log("OPENAI:", apiKey ? "OK" : "MISSING");

  const client = new OpenAI({ apiKey });

  const systemPrompt =
    "Return ONLY JSON: {\"classification\":\"REAL|PARCIAL|FAKE|QUEBRADO\",\"problems\":[string],\"missing\":[string],\"suggestions\":[string]}";
  const userPromptParts = [
    `Module: ${module}`,
    code ? `Code: ${code}` : "Code: (none)"
  ];

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPromptParts.join("\n") }
  ];

  const payload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: "gpt-4o-mini",
    messages,
    max_tokens: 220,
    temperature: 0,
    stream: false
  };

  console.log("OPENAI_AUDIT_PAYLOAD:", JSON.stringify(payload));

  const response = await client.chat.completions.create(payload);
  const content = response.choices?.[0]?.message?.content || "";
  const parsed = extractJson(content);
  return normalizeResponse(parsed, content);
};

export default OpenAIAuditService;
