import { spawn } from "child_process";

type AudioMediaDescriptor = {
  mimetype?: string;
  filename?: string;
  originalname?: string;
};

export const WHATSAPP_COMPATIBLE_AUDIO_MIMETYPE = "audio/mpeg";
export const WHATSAPP_VOICE_MIMETYPE = "audio/ogg;codecs=opus";

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
      "32k",
      "-vbr",
      "on",
      "-compression_level",
      "10",
      "-ar",
      "48000",
      "-ac",
      "1",
      "-frame_duration",
      "60",
      "-application",
      "voip",
      "-f",
      "ogg",
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

export const convertAudioToMp3 = (inputPath: string): Promise<string> => {
  const outputPath = `${inputPath.replace(/\.[^.]+$/, "")}.mp3`;

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-acodec",
      "libmp3lame",
      "-ar",
      "44100",
      "-ac",
      "1",
      "-b:a",
      "128k",
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