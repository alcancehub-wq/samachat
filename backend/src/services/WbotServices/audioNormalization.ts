import { spawn } from "child_process";

type AudioMediaDescriptor = {
  mimetype?: string;
  filename?: string;
  originalname?: string;
};

const VOICE_AUDIO_EXTENSION_PATTERN = /\.(ogg|opus|webm)$/i;

const includesVoiceAudioContainer = (value?: string): boolean => {
  if (!value) {
    return false;
  }

  return /(ogg|opus|webm)/i.test(value);
};

export const shouldNormalizeAudioForWhatsApp = (
  media: AudioMediaDescriptor
): boolean => {
  const mimeType = (media.mimetype || "").toLowerCase();
  const fileName = (media.filename || "").toLowerCase();
  const originalName = (media.originalname || "").toLowerCase();
  const isAudio =
    mimeType.startsWith("audio/") ||
    VOICE_AUDIO_EXTENSION_PATTERN.test(fileName) ||
    VOICE_AUDIO_EXTENSION_PATTERN.test(originalName);

  if (!isAudio) {
    return false;
  }

  return (
    includesVoiceAudioContainer(mimeType) ||
    VOICE_AUDIO_EXTENSION_PATTERN.test(fileName) ||
    VOICE_AUDIO_EXTENSION_PATTERN.test(originalName)
  );
};

export const shouldSendAudioAsVoice = (media: AudioMediaDescriptor): boolean => {
  const mimeType = (media.mimetype || "").toLowerCase();
  const fileName = (media.filename || "").toLowerCase();

  return includesVoiceAudioContainer(mimeType) || /\.(ogg|opus)$/i.test(fileName);
};

export const convertAudioToOgg = (inputPath: string): Promise<string> => {
  const outputPath = `${inputPath.replace(/\.[^.]+$/, "")}.wa.ogg`;

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-c:a",
      "libopus",
      "-b:a",
      "64k",
      "-ar",
      "48000",
      "-ac",
      "1",
      "-application",
      "voip",
      outputPath
    ]);

    let errorOutput = "";
    ffmpeg.stderr.on("data", data => {
      errorOutput += data.toString();
    });

    ffmpeg.on("error", err => {
      reject(err);
    });

    ffmpeg.on("close", code => {
      if (code !== 0) {
        reject(new Error(errorOutput || `ffmpeg exited with code ${code}`));
        return;
      }
      resolve(outputPath);
    });
  });
};