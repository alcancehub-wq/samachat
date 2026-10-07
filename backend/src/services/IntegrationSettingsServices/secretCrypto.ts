import crypto from "crypto";
import AppError from "../../errors/AppError";

// Criptografia dos segredos das integracoes (chaves de Gemini, Claude, ElevenLabs).
//
// AES-256-GCM com a chave INTEGRATION_SETTINGS_ENC_KEY (64 caracteres hex = 32 bytes),
// que vive so no ambiente do servidor. Formato guardado: enc:v1:<iv>:<tag>:<dado>
// (base64). Sem a chave configurada NAO se grava segredo: nada vai em texto puro
// para o banco. Gere a chave com:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

const PREFIX = "enc:v1:";

const loadKey = (): Buffer => {
  const hex = String(process.env.INTEGRATION_SETTINGS_ENC_KEY || "").trim();
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new AppError("ERR_INTEGRATION_ENC_KEY_MISSING", 500);
  }
  return Buffer.from(hex, "hex");
};

export const isEncrypted = (value: unknown): boolean =>
  typeof value === "string" && value.startsWith(PREFIX);

// `aad` amarra o segredo ao provedor e ao campo: um valor copiado de outra linha
// nao decifra (ex.: trocar a chave do Claude pela do Gemini no banco).
export const encryptSecret = (plain: string, aad: string): string => {
  const key = loadKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad));
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${data.toString("base64")}`;
};

// Devolve o texto puro. Valor sem o prefixo (legado em texto puro) volta como esta,
// para nao perder a chave; ele e regravado cifrado no proximo salvamento.
export const decryptSecret = (stored: string, aad: string): string => {
  if (!isEncrypted(stored)) return stored;
  const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split(":");
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", loadKey(), Buffer.from(ivB64, "base64"));
    decipher.setAAD(Buffer.from(aad));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final()
    ]).toString("utf8");
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("ERR_INTEGRATION_SECRET_UNREADABLE", 500);
  }
};
