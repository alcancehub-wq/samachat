// Campos de cada integracao externa. `secret` = nunca volta inteiro para a tela
// (so "chave salva" e os 4 ultimos caracteres) e e cifrado no banco (secretCrypto).
//
// Fora do escopo desta integracao (ficam para o motor de WhatsApp existente do
// SamaChat): Evolution API e WhatsApp oficial da Meta.
export type FieldKind = "string" | "number" | "boolean";

export interface FieldDef {
  key: string;
  kind: FieldKind;
  secret?: boolean;
  default?: string | number | boolean;
  min?: number;
  max?: number;
}

export const PROVIDERS: Record<string, FieldDef[]> = {
  // Voz das respostas em audio (a mesma da BIA).
  elevenlabs: [
    { key: "apiKey", kind: "string", secret: true },
    { key: "voiceId", kind: "string", default: "33B4UnXyTNbgLmdEDh5P" },
    { key: "model", kind: "string", default: "eleven_turbo_v2_5" },
    { key: "stability", kind: "number", default: 0.75, min: 0, max: 1 },
    { key: "similarityBoost", kind: "number", default: 0.8, min: 0, max: 1 },
    { key: "style", kind: "number", default: 0.3, min: 0, max: 1 },
    { key: "speakerBoost", kind: "boolean", default: true },
    { key: "audioReply", kind: "boolean", default: false }
  ],
  // Motores de IA. Qual deles conversa com os leads e escolha do AGENTE SDR
  // (Treinamento da IA), nao uma regra global do sistema. A OpenAI vive em
  // OpenAISetting.
  gemini: [
    { key: "apiKey", kind: "string", secret: true },
    { key: "model", kind: "string", default: "gemini-3.5-flash" }
  ],
  claude: [
    { key: "apiKey", kind: "string", secret: true },
    { key: "model", kind: "string", default: "claude-sonnet-5-5" }
  ]
};

export const isProvider = (value: string): boolean =>
  Object.prototype.hasOwnProperty.call(PROVIDERS, value);

export const defaultsFor = (provider: string): Record<string, any> => {
  const out: Record<string, any> = {};
  PROVIDERS[provider].forEach(field => {
    if (field.default !== undefined) out[field.key] = field.default;
  });
  return out;
};
