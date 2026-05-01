import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import AppError from "../../errors/AppError";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { whatsappProvider, ProviderMessage } from "../../providers/WhatsApp";

import formatBody from "../../helpers/Mustache";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import { sleep } from "../../utils/sleep";
import { logger } from "../../utils/logger";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
}

const INITIAL_READY_TIMEOUT_MS = 5000;
const RECOVERY_READY_TIMEOUT_MS = 15000;
const startingSessions = new Set<number>();

const isNoLidError = (err: unknown): boolean => {
  if (err instanceof Error && /No LID for user/i.test(err.message)) {
    return true;
  }
  if (typeof err === "object" && err !== null) {
    const message = (err as { message?: string }).message;
    if (message && /No LID for user/i.test(message)) {
      return true;
    }
  }
  return false;
};

const looksLikePhoneNumber = (value?: string | null): value is string => {
  if (!value) {
    return false;
  }

  return /^55\d{8,13}$/.test(value);
};

const normalizeLid = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  return value.includes("@") ? value : `${value}@lid`;
};

const safeCheckNumber = async (
  whatsappId: number,
  number: string
): Promise<string> => {
  if (!looksLikePhoneNumber(number)) {
    return "";
  }

  try {
    return await whatsappProvider.checkNumber(whatsappId, number);
  } catch (err) {
    logger.warn(
      { err, whatsappId, number },
      "SendWhatsAppMedia checkNumber failed, falling back to raw number"
    );
    return "";
  }
};

const shouldConvertAudioToOgg = (media: Express.Multer.File): boolean => {
  const mimeType = (media.mimetype || "").toLowerCase();
  const fileName = (media.filename || "").toLowerCase();
  const originalName = (media.originalname || "").toLowerCase();

  const isAudio = mimeType.startsWith("audio/") || /\.webm$/i.test(fileName);
  const isWebm =
    mimeType.includes("webm") ||
    /\.webm$/i.test(fileName) ||
    /\.webm$/i.test(originalName);

  return isAudio && isWebm;
};

const convertWebmToOgg = (inputPath: string): Promise<string> => {
  const outputPath = /\.webm$/i.test(inputPath)
    ? inputPath.replace(/\.webm$/i, ".ogg")
    : `${inputPath}.ogg`;

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-c:a",
      "libopus",
      "-b:a",
      "64k",
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

const triggerWhatsappSessionStart = (whatsapp: Whatsapp): void => {
  if (startingSessions.has(whatsapp.id)) {
    return;
  }

  startingSessions.add(whatsapp.id);
  void StartWhatsAppSession(whatsapp).finally(() => {
    startingSessions.delete(whatsapp.id);
  });
};

const ensureWhatsappSession = async (
  ticket: Ticket,
  forceStart = false
): Promise<Whatsapp> => {
  let whatsappId = ticket.whatsappId;

  if (!whatsappId) {
    const fallbackWhatsapp = await GetDefaultWhatsApp(ticket.userId);
    await CheckContactOpenTickets(ticket.contactId, fallbackWhatsapp.id);
    await ticket.update({ whatsappId: fallbackWhatsapp.id });
    whatsappId = fallbackWhatsapp.id;
  }

  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (!whatsapp) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }

  if (forceStart || !whatsappProvider.hasSession(whatsapp.id)) {
    triggerWhatsappSessionStart(whatsapp);
  }

  return whatsapp;
};

const waitForWhatsAppReady = async (
  whatsappId: number,
  timeoutMs = 20000
): Promise<boolean> => {
  if (whatsappProvider.isSessionReady(whatsappId)) {
    return true;
  }

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (whatsappProvider.isSessionReady(whatsappId)) {
      return true;
    }

    await sleep(1000);
  }

  return whatsappProvider.isSessionReady(whatsappId);
};

const ensureWhatsappReady = async (
  ticket: Ticket,
  whatsapp: Whatsapp
): Promise<void> => {
  if (await waitForWhatsAppReady(whatsapp.id, INITIAL_READY_TIMEOUT_MS)) {
    return;
  }

  await ensureWhatsappSession(ticket, true);

  if (await waitForWhatsAppReady(whatsapp.id, RECOVERY_READY_TIMEOUT_MS)) {
    return;
  }

  throw new AppError("ERR_WAPP_NOT_INITIALIZED");
};

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body
}: Request): Promise<ProviderMessage> => {
  try {
    const whatsapp = await ensureWhatsappSession(ticket);
    await ensureWhatsappReady(ticket, whatsapp);

    const storedNumber = ticket.contact.number || "";
    const storedLid = normalizeLid(ticket.contact.lid || "");

    let normalizedNumber = await safeCheckNumber(whatsapp.id, storedNumber);
    if (!normalizedNumber) {
      console.warn("SendWhatsAppMedia number not validated on first try", {
        ticketId: ticket.id,
        whatsappId: whatsapp.id,
        number: storedNumber,
        lid: storedLid
      });
      triggerWhatsappSessionStart(whatsapp);
      await ensureWhatsappReady(ticket, whatsapp);
      normalizedNumber = await safeCheckNumber(whatsapp.id, storedNumber);
    }

    const chatIdentifier = normalizedNumber || storedLid || storedNumber;

    if (!chatIdentifier) {
      throw new AppError("ERR_WAPP_INVALID_CONTACT");
    }

    if (normalizedNumber && normalizedNumber !== storedNumber) {
      await ticket.contact.update({ number: normalizedNumber });
    }

    const chatId = ticket.isGroup
      ? `${chatIdentifier}@g.us`
      : normalizedNumber
      ? `${normalizedNumber}@c.us`
      : storedLid ||
        (chatIdentifier.includes("@") ? chatIdentifier : `${chatIdentifier}@c.us`);

    const hasBody = body
      ? formatBody(body as string, ticket.contact)
      : undefined;

    let mediaInput = {
      filename: media.filename,
      mimetype: media.mimetype,
      path: media.path
    };

    let convertedPath: string | null = null;
    if (shouldConvertAudioToOgg(media)) {
      convertedPath = await convertWebmToOgg(media.path);
      mediaInput = {
        filename: `${path.parse(media.filename).name}.ogg`,
        mimetype: "audio/ogg",
        path: convertedPath
      };
    }

    const mediaOptions = {
      caption: hasBody,
      sendAudioAsVoice: mediaInput.mimetype.startsWith("audio/"),
      sendMediaAsDocument:
        mediaInput.mimetype.startsWith("image/") &&
        !/^.*\.(jpe?g|png|gif)?$/i.exec(mediaInput.filename)
    };

    let sentMessage: ProviderMessage;
    try {
      sentMessage = await whatsappProvider.sendMedia(
        whatsapp.id,
        chatId,
        mediaInput,
        mediaOptions
      );
    } catch (err) {
      if (isNoLidError(err)) {
        if (storedLid && chatId !== storedLid) {
          console.warn("SendWhatsAppMedia retrying with LID chat id", {
            ticketId: ticket.id,
            whatsappId: ticket.whatsappId,
            number: storedNumber,
            lid: storedLid
          });
          sentMessage = await whatsappProvider.sendMedia(
            whatsapp.id,
            storedLid,
            mediaInput,
            mediaOptions
          );
        } else {
          console.warn("SendWhatsAppMedia blocked by No LID for user", {
            ticketId: ticket.id,
            whatsappId: ticket.whatsappId,
            number: storedNumber,
            lid: storedLid
          });
          throw new AppError("ERR_WAPP_INVALID_CONTACT");
        }
      }
      if (err instanceof AppError && err.message === "ERR_WAPP_NOT_INITIALIZED") {
        console.error("SendWhatsAppMedia session not initialized", {
          ticketId: ticket.id,
          whatsappId: whatsapp.id,
          whatsappStatus: whatsapp.status
        });
        await ensureWhatsappSession(ticket, true);
        await ensureWhatsappReady(ticket, whatsapp);
        await sleep(2000);
        sentMessage = await whatsappProvider.sendMedia(
          whatsapp.id,
          chatId,
          mediaInput,
          mediaOptions
        );
      } else if (!(err instanceof AppError)) {
        console.warn("SendWhatsAppMedia failed, restarting session", {
          ticketId: ticket.id,
          whatsappId: whatsapp.id,
          chatId,
          error: err
        });
        await ensureWhatsappSession(ticket, true);
        await ensureWhatsappReady(ticket, whatsapp);
        await sleep(2000);
        sentMessage = await whatsappProvider.sendMedia(
          whatsapp.id,
          chatId,
          mediaInput,
          mediaOptions
        );
      } else {
        throw err;
      }
    }

    await ticket.update({ lastMessage: body || media.filename });

    fs.unlinkSync(media.path);
    if (convertedPath) {
      fs.unlinkSync(convertedPath);
    }

    return sentMessage;
  } catch (err) {
    if (err instanceof AppError && err.message === "ERR_WAPP_INVALID_CONTACT") {
      throw err;
    }
    console.error("SendWhatsAppMedia error:", {
      error: err,
      ticketId: ticket.id,
      whatsappId: ticket.whatsappId,
      number: ticket.contact.number
    });
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
