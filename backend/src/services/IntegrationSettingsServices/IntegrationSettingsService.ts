import AppError from "../../errors/AppError";
import IntegrationSetting from "../../models/IntegrationSetting";
import { PROVIDERS, defaultsFor, isProvider } from "./providers";
import { decryptSecret, encryptSecret } from "./secretCrypto";

// Tem o minimo para funcionar? (so entao pode ser ativado)
export const isConfigured = (
  provider: string,
  values: Record<string, any>
): boolean => Boolean(values.apiKey);

export interface IntegrationConfig {
  isActive: boolean;
  values: Record<string, any>;
}

const parse = (raw: string | null): Record<string, any> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    return {};
  }
};

const assertProvider = (provider: string): void => {
  if (!isProvider(provider)) throw new AppError("ERR_INTEGRATION_UNKNOWN", 404);
};

const aadFor = (provider: string, key: string): string => `${provider}:${key}`;

const isSecretKey = (provider: string, key: string): boolean =>
  PROVIDERS[provider].some(field => field.key === key && field.secret);

// Lê a linha do banco e devolve os valores com os segredos em texto puro (so em
// memoria). Segredo cifrado e decifrado aqui; legado em texto puro passa direto.
const readValues = (provider: string, raw: string | null): Record<string, any> => {
  const stored = parse(raw);
  Object.keys(stored).forEach(key => {
    if (isSecretKey(provider, key) && typeof stored[key] === "string" && stored[key]) {
      stored[key] = decryptSecret(stored[key], aadFor(provider, key));
    }
  });
  return { ...defaultsFor(provider), ...stored };
};

// Monta o JSON que vai para o banco: todo segredo sai cifrado.
const serialize = (provider: string, values: Record<string, any>): string => {
  const out: Record<string, any> = { ...values };
  Object.keys(out).forEach(key => {
    if (isSecretKey(provider, key) && typeof out[key] === "string" && out[key]) {
      out[key] = encryptSecret(out[key], aadFor(provider, key));
    }
  });
  return JSON.stringify(out);
};

// Configuracao COMPLETA (com segredos). Uso interno do backend: nunca devolver
// isto para a tela; use getPublicIntegration.
export const getIntegrationConfig = async (
  provider: string
): Promise<IntegrationConfig> => {
  assertProvider(provider);
  const row = await IntegrationSetting.findOne({ where: { provider } });
  return {
    isActive: row ? row.isActive : false,
    values: readValues(provider, row ? row.config : null)
  };
};

const hint = (secret: string): string =>
  secret.length > 4 ? `••••${secret.slice(-4)}` : "••••";

// O que a tela recebe: segredos nunca vao inteiros.
export const getPublicIntegration = async (provider: string) => {
  const { isActive, values } = await getIntegrationConfig(provider);
  const publicValues: Record<string, any> = {};
  const secrets: Record<string, { set: boolean; hint: string }> = {};

  PROVIDERS[provider].forEach(field => {
    const value = values[field.key];
    if (field.secret) {
      const set = Boolean(value);
      secrets[field.key] = { set, hint: set ? hint(String(value)) : "" };
    } else {
      publicValues[field.key] = value === undefined ? "" : value;
    }
  });

  return { provider, isActive, values: publicValues, secrets };
};

interface UpdateInput {
  isActive?: boolean;
  values?: Record<string, any>;
  clearSecrets?: string[];
}

export const updateIntegration = async (
  provider: string,
  input: UpdateInput
) => {
  assertProvider(provider);
  const current = await getIntegrationConfig(provider);
  const next: Record<string, any> = { ...current.values };
  const incoming = input.values || {};

  PROVIDERS[provider].forEach(field => {
    const raw = incoming[field.key];

    if (field.secret) {
      if (input.clearSecrets && input.clearSecrets.includes(field.key)) {
        delete next[field.key];
        return;
      }
      // vazio = manter o que ja esta salvo
      if (typeof raw === "string" && raw.trim() !== "") {
        next[field.key] = raw.trim();
      }
      return;
    }

    if (raw === undefined) return;

    if (field.kind === "number") {
      const n = Number(raw);
      if (!Number.isFinite(n)) throw new AppError("ERR_INTEGRATION_INVALID_VALUE");
      if (
        (field.min !== undefined && n < field.min) ||
        (field.max !== undefined && n > field.max)
      ) {
        throw new AppError("ERR_INTEGRATION_INVALID_VALUE");
      }
      next[field.key] = n;
    } else if (field.kind === "boolean") {
      next[field.key] = Boolean(raw);
    } else {
      next[field.key] = String(raw).trim();
    }
  });

  const isActive =
    typeof input.isActive === "boolean" ? input.isActive : current.isActive;

  // So ativa com as credenciais cadastradas.
  if (isActive && !isConfigured(provider, next)) {
    throw new AppError("ERR_INTEGRATION_NOT_CONFIGURED", 400);
  }

  // Serializa antes de gravar: sem a chave de criptografia no servidor, falha
  // aqui e nada e salvo em texto puro.
  const config = serialize(provider, next);

  const [row] = await IntegrationSetting.findOrCreate({
    where: { provider },
    defaults: { provider, isActive, config }
  });
  await row.update({ isActive, config });

  return getPublicIntegration(provider);
};
