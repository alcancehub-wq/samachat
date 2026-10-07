import axios from "axios";
import AppError from "../../errors/AppError";
import { getIntegrationConfig } from "./IntegrationSettingsService";

const API = "https://api.elevenlabs.io/v1/text-to-speech";

// Texto -> audio (mp3) com a voz configurada. Usado pelo "Testar voz" e,
// quando a resposta em audio estiver ligada, pelo agente.
export const synthesizeSpeech = async (
  text: string,
  opts: { requireActive?: boolean } = {}
): Promise<Buffer> => {
  const { isActive, values } = await getIntegrationConfig("elevenlabs");

  if (opts.requireActive && !isActive) {
    throw new AppError("ERR_ELEVENLABS_INACTIVE", 400);
  }
  if (!values.apiKey) throw new AppError("ERR_ELEVENLABS_NO_API_KEY", 400);

  try {
    const response = await axios.post(
      `${API}/${encodeURIComponent(values.voiceId)}?output_format=mp3_44100_128`,
      {
        text,
        model_id: values.model,
        voice_settings: {
          stability: values.stability,
          similarity_boost: values.similarityBoost,
          style: values.style,
          use_speaker_boost: values.speakerBoost
        }
      },
      {
        headers: { "xi-api-key": values.apiKey, Accept: "audio/mpeg" },
        responseType: "arraybuffer",
        timeout: 30000
      }
    );
    return Buffer.from(response.data);
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) throw new AppError("ERR_ELEVENLABS_UNAUTHORIZED", 401);
    if (status === 404 || status === 422) throw new AppError("ERR_ELEVENLABS_BAD_VOICE", 400);
    if (status === 429) throw new AppError("ERR_ELEVENLABS_RATE_LIMIT", 429);
    throw new AppError("ERR_ELEVENLABS_REQUEST_FAILED", 502);
  }
};
