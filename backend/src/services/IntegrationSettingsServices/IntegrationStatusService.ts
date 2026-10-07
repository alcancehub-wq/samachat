import axios from "axios";
import GetOpenAISettingsService from "../OpenAISettingsServices/GetOpenAISettingsService";
import { getIntegrationConfig, isConfigured } from "./IntegrationSettingsService";

export type StatusState =
  | "not_configured"
  | "inactive"
  | "connected"
  | "rejected"
  | "unreachable"
  | "configured";

export interface LiveStatus {
  state: StatusState;
  label: string;
}

const LABELS: Record<StatusState, string> = {
  not_configured: "Não configurado",
  inactive: "Desativado",
  connected: "Conectado",
  rejected: "Chave recusada",
  unreachable: "Sem conexão",
  configured: "Configurado"
};

const result = (state: StatusState): LiveStatus => ({ state, label: LABELS[state] });

// Resultado de uma chamada de checagem: 2xx = conectado; 401/403 = recusada;
// sem resposta = sem conexao; outro = nao deu para confirmar (so "configurado").
const classify = async (
  call: () => Promise<unknown>,
  rejectOn400 = false
): Promise<LiveStatus> => {
  try {
    await call();
    return result("connected");
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) return result("rejected");
    // O Google responde 400 ("API key not valid") para chave errada.
    if (rejectOn400 && status === 400) return result("rejected");
    if (!status) return result("unreachable");
    return result("configured");
  }
};

// Status ao vivo da OpenAI. A checagem lista os modelos: nao gasta credito.
export const getOpenAIStatus = async (): Promise<LiveStatus> => {
  const s = await GetOpenAISettingsService();
  if (!s.apiKey) return result("not_configured");
  if (!s.isActive) return result("inactive");
  return classify(() =>
    axios.get("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${s.apiKey}` },
      timeout: 8000
    })
  );
};

// Status ao vivo dos outros servicos (checagens leves, sem enviar nada).
export const getIntegrationStatus = async (provider: string): Promise<LiveStatus> => {
  const { isActive, values } = await getIntegrationConfig(provider);

  if (!isConfigured(provider, values)) return result("not_configured");
  if (!isActive) return result("inactive");

  if (provider === "gemini") {
    return classify(
      () =>
        axios.get("https://generativelanguage.googleapis.com/v1beta/openai/models", {
          headers: { Authorization: `Bearer ${values.apiKey}` },
          timeout: 8000
        }),
      true
    );
  }

  if (provider === "claude") {
    return classify(() =>
      axios.get("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": values.apiKey, "anthropic-version": "2023-06-01" },
        timeout: 8000
      })
    );
  }

  if (provider === "elevenlabs") {
    return classify(() =>
      axios.get("https://api.elevenlabs.io/v1/models", {
        headers: { "xi-api-key": values.apiKey },
        timeout: 8000
      })
    );
  }

  return result("configured");
};
