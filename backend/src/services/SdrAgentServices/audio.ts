import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";

import { logger } from "../../utils/logger";
import GetOpenAISettingsService from "../OpenAISettingsServices/GetOpenAISettingsService";
import { getIntegrationConfig } from "../IntegrationSettingsServices/IntegrationSettingsService";
import { synthesizeSpeech } from "../IntegrationSettingsServices/elevenlabs";

const publicFolder = path.join(__dirname, "..", "..", "..", "public");

export const isAudioType = (mediaType?: string | null): boolean =>
  mediaType === "audio" || mediaType === "ptt";

// Transcricoes ja feitas (por id da mensagem), para nao pagar duas vezes.
const transcriptCache = new Map<string, string>();

// Audio do lead -> texto (Whisper da OpenAI, com a mesma chave do agente).
// Devolve null se nao der: o agente segue sem o conteudo do audio.
export const transcribeAudioFile = async (
  messageId: string,
  filename: string
): Promise<string | null> => {
  const cached = transcriptCache.get(messageId);
  if (cached !== undefined) return cached;

  try {
    const settings = await GetOpenAISettingsService();
    // Whisper usa a chave da OpenAI mesmo quando outra IA e a que conversa.
    if (!settings.apiKey) return null;

    // So le arquivos da pasta publica (sem "../" no nome).
    const safeName = path.basename(filename);
    const filePath = path.join(publicFolder, safeName);
    if (!fs.existsSync(filePath)) return null;

    const form = new FormData();
    form.append("file", fs.createReadStream(filePath), safeName);
    form.append("model", "whisper-1");
    form.append("language", "pt");

    const { data } = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${settings.apiKey}`
        },
        timeout: 30000,
        maxBodyLength: Infinity
      }
    );

    const text = String(data?.text || "").trim();
    if (text) transcriptCache.set(messageId, text);
    return text || null;
  } catch (err) {
    logger.warn({ err: err?.message, messageId }, "[sdr] nao consegui transcrever o audio");
    return null;
  }
};

// Resposta em audio so quando: ElevenLabs ativa, com chave e "responder em
// audio" ligado.
export const voiceReplyEnabled = async (): Promise<boolean> => {
  const { isActive, values } = await getIntegrationConfig("elevenlabs");
  return Boolean(isActive && values.apiKey && values.audioReply);
};

// Gera o audio da resposta e grava em um arquivo para o envio (o envio apaga
// o arquivo depois). Devolve null se algo falhar: quem chamou manda texto.
export const buildVoiceReplyFile = async (
  text: string
): Promise<{ filename: string; path: string; mimetype: string } | null> => {
  try {
    const audio = await synthesizeSpeech(text, { requireActive: true });
    const filename = `voz-${Date.now()}-${randomBytes(4).toString("hex")}.mp3`;
    const filePath = path.join(publicFolder, filename);
    fs.writeFileSync(filePath, audio);
    return { filename, path: filePath, mimetype: "audio/mpeg" };
  } catch (err) {
    logger.warn({ err: err?.message }, "[sdr] nao consegui gerar a voz; vou responder por texto");
    return null;
  }
};
