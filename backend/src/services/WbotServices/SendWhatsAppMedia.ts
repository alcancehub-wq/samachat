import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import IsPlausiblePhoneNumber from "../../helpers/IsPlausiblePhoneNumber";
import NormalizeProviderCheckNumber from "../../helpers/NormalizeProviderCheckNumber";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { whatsappProvider, ProviderMessage } from "../../providers/WhatsApp";

import formatBody from "../../helpers/Mustache";
import ResolveMessageVariablesService from "../Variables/ResolveMessageVariablesService";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import {
  convertAudioToOgg,
  convertAudioToMp3,
  shouldNormalizeAudioForWhatsApp,
  shouldSendAudioAsVoice,
  WHATSAPP_COMPATIBLE_AUDIO_MIMETYPE,
  WHATSAPP_VOICE_MIMETYPE
} from "./audioNormalization";
import { shouldSendMediaAsDocument } from "./mediaDelivery";
import { sleep } from "../../utils/sleep";
import { logger } from "../../utils/logger";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
  forceSendAudioAsVoice?: boolean;
}

const INITIAL_READY_TIMEOUT_MS = 5000;
const RECOVERY_READY_TIMEOUT_MS = 15000;
const RECORDED_AUDIO_ECHO_WAIT_MS = 5000;
const RECORDED_AUDIO_ECHO_POLL_INTERVAL_MS = 500;
const startingSessions = new Set<number>();
const AUDIO_UPLOAD_EXTENSION_PATTERN = /\.(ogg|opus|webm|mp3|wav|m4a|aac)$/i;
const COMPOSER_RECORDED_AUDIO_PATTERN = /^recorded_\d{10,}\.(ogg|webm)$/i;

const getConfiguredProviderName = (): string =>
  process.env.WHATSAPP_PROVIDER || "wwebjs";

const getFileSizeOrNull = (filePath?: string): number | null => {
  if (!filePath) {
    return null;
  }

  try {
    return fs.statSync(filePath).size;
  } catch (err) {
    logger.warn({ err, filePath }, "Failed to read media file size for audit log");
    return null;
  }
};

const getFileExtension = (fileName?: string): string => {
  if (!fileName) {
    return "";
  }

  return path.extname(fileName).toLowerCase();
};

const safelyRemoveFile = (filePath?: string | null): void => {
  if (!filePath) {
    return;
  }

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    logger.warn({ err, filePath }, "Failed to cleanup media file after send");
  }
};

const shouldAuditAudioContract = (media: Express.Multer.File): boolean => {
  const mimeType = (media.mimetype || "").toLowerCase();
  const originalName = media.originalname || "";
  const storedName = media.filename || "";

  return (
    mimeType.startsWith("audio/") ||
    AUDIO_UPLOAD_EXTENSION_PATTERN.test(originalName) ||
    AUDIO_UPLOAD_EXTENSION_PATTERN.test(storedName)
  );
};

const isComposerRecordedAudioUpload = (media: Express.Multer.File): boolean => {
  const mimeType = (media.mimetype || "").toLowerCase();
  const originalName = (media.originalname || "").toLowerCase();

  return (
    mimeType.startsWith("audio/") &&
    /(ogg|opus|webm)/i.test(mimeType) &&
    COMPOSER_RECORDED_AUDIO_PATTERN.test(originalName)
  );
};

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
  if (!IsPlausiblePhoneNumber(number)) {
    return "";
  }

  try {
    const checkedNumber = await whatsappProvider.checkNumber(whatsappId, number);
    return NormalizeProviderCheckNumber(checkedNumber);
  } catch (err) {
    logger.warn(
      { err, whatsappId, number },
      "SendWhatsAppMedia checkNumber failed, falling back to raw number"
    );
    return "";
  }
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
  if (whatsappProvider.hasSession(whatsapp.id)) {
    return;
  }

  if (await waitForWhatsAppReady(whatsapp.id, INITIAL_READY_TIMEOUT_MS)) {
    return;
  }

  await ensureWhatsappSession(ticket, true);

  if (await waitForWhatsAppReady(whatsapp.id, RECOVERY_READY_TIMEOUT_MS)) {
    return;
  }

  throw new AppError("ERR_WAPP_NOT_INITIALIZED");
};

const waitForRecentRecordedAudioEcho = async (
  ticketId: number,
  startedAt: Date
): Promise<boolean> => {
  const startedAtTolerance = new Date(startedAt.getTime() - 2000);
  const attempts = Math.max(
    1,
    Math.ceil(RECORDED_AUDIO_ECHO_WAIT_MS / RECORDED_AUDIO_ECHO_POLL_INTERVAL_MS)
  );

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const recentAudioMessage = await Message.findOne({
      where: {
        ticketId,
        fromMe: true,
        mediaType: {
          [Op.in]: ["audio", "ptt"]
        },
        createdAt: {
          [Op.gte]: startedAtTolerance
        }
      },
      order: [["createdAt", "DESC"]]
    });

    if (recentAudioMessage) {
      return true;
    }

    if (attempt < attempts - 1) {
      await sleep(RECORDED_AUDIO_ECHO_POLL_INTERVAL_MS);
    }
  }

  return false;
};

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body,
  forceSendAudioAsVoice
}: Request): Promise<ProviderMessage> => {
  try {
    const requestStartedAt = new Date();
    const whatsapp = await ensureWhatsappSession(ticket);
    await ensureWhatsappReady(ticket, whatsapp);
    const shouldAuditAudio = shouldAuditAudioContract(media);
    const providerName = getConfiguredProviderName();
    const composerRecordedAudio = isComposerRecordedAudioUpload(media);

    const storedNumber = ticket.contact.number || "";
    const storedLid = normalizeLid(ticket.contact.lid || "");

    let normalizedNumber = "";
    const resolveNormalizedChatId = async (): Promise<string | null> => {
      if (ticket.isGroup || !storedNumber) {
        return null;
      }

      if (!normalizedNumber) {
        normalizedNumber = await safeCheckNumber(whatsapp.id, storedNumber);
      }

      return normalizedNumber ? `${normalizedNumber}@c.us` : null;
    };

    const chatIdentifier = storedLid || storedNumber;

    if (!chatIdentifier) {
      throw new AppError("ERR_WAPP_INVALID_CONTACT");
    }

    let chatId = ticket.isGroup
      ? `${chatIdentifier}@g.us`
      : storedLid ||
        (chatIdentifier.includes("@") ? chatIdentifier : `${chatIdentifier}@c.us`);

    const resolvedBody = body
      ? ResolveMessageVariablesService({
          template: body as string,
          ticket,
          contact: ticket.contact,
          user: ticket.user
        }).text
      : undefined;

    const hasBody = resolvedBody
      ? formatBody(resolvedBody, ticket.contact)
      : undefined;

    let mediaInput = {
      filename: media.filename,
      mimetype: media.mimetype,
      path: media.path
    };

    let convertedPath: string | null = null;
    let normalizedToOggOpus = false;
    let normalizedToMp3CommonAudio = false;
    let usedMp3Fallback = false;

    if (shouldAuditAudio) {
      logger.info(
        {
          ticketId: ticket.id,
          whatsappId: whatsapp.id,
          originalName: media.originalname,
          originalMimetype: media.mimetype,
          originalSize: media.size || getFileSizeOrNull(media.path),
          originalExtension: getFileExtension(media.originalname || media.filename)
        },
        "Audio contract audit: before normalization"
      );
    }

    if (shouldNormalizeAudioForWhatsApp(media)) {
      try {
        convertedPath = await convertAudioToOgg(media.path);
        normalizedToOggOpus = true;
        mediaInput = {
          filename: `${path.parse(media.filename).name}.ogg`,
          mimetype: WHATSAPP_VOICE_MIMETYPE,
          path: convertedPath
        };
      } catch (voiceConversionError) {
        logger.warn(
          { err: voiceConversionError, path: media.path, filename: media.filename },
          "Voice-note normalization failed, falling back to mp3 audio"
        );

        convertedPath = await convertAudioToMp3(media.path);
        normalizedToMp3CommonAudio = true;
        usedMp3Fallback = true;
        mediaInput = {
          filename: `${path.parse(media.filename).name}.mp3`,
          mimetype: WHATSAPP_COMPATIBLE_AUDIO_MIMETYPE,
          path: convertedPath
        };
      }
    }

    if (shouldAuditAudio) {
      logger.info(
        {
          ticketId: ticket.id,
          whatsappId: whatsapp.id,
          finalFilename: mediaInput.filename,
          finalMimetype: mediaInput.mimetype,
          finalSize: getFileSizeOrNull(mediaInput.path),
          finalExtension: getFileExtension(mediaInput.filename),
          normalizedToOggOpus,
          normalizedToMp3CommonAudio,
          usedMp3Fallback
        },
        "Audio contract audit: after normalization"
      );
    }

    const sendAsVoice = shouldSendAudioAsVoice(mediaInput);
    const effectiveSendAsVoice =
      typeof forceSendAudioAsVoice === "boolean"
        ? forceSendAudioAsVoice
        : sendAsVoice;
    const effectiveSendMediaAsDocument = shouldSendMediaAsDocument(mediaInput, {
      sendAsVoice: effectiveSendAsVoice
    });

    const mediaOptions = {
      // PTT voice notes are more stable without a caption payload.
      caption: effectiveSendAsVoice ? undefined : hasBody,
      sendAudioAsVoice: effectiveSendAsVoice,
      sendMediaAsDocument: effectiveSendMediaAsDocument
    };
    const providerMediaInput = mediaInput;

    const sendWithChatId = async (targetChatId: string): Promise<ProviderMessage> => {
      if (shouldAuditAudio) {
        logger.info(
          {
            ticketId: ticket.id,
            whatsappId: whatsapp.id,
            provider: providerName,
            composerRecordedAudio,
            sendAudioAsVoice: mediaOptions.sendAudioAsVoice,
            sendMediaAsDocument: mediaOptions.sendMediaAsDocument,
            deliveredMimetype: mediaInput.mimetype,
            deliveredFilename: providerMediaInput.filename || null
          },
          "Audio contract audit: provider send request"
        );
      }

      try {
        const providerMessage = await whatsappProvider.sendMedia(
          whatsapp.id,
          targetChatId,
          providerMediaInput,
          mediaOptions
        );

        if (shouldAuditAudio) {
          logger.info(
            {
              ticketId: ticket.id,
              whatsappId: whatsapp.id,
              provider: providerName,
              messageId: providerMessage.id || null,
              ack: providerMessage.ack ?? null
            },
            "Audio contract audit: provider send success"
          );
        }

        return providerMessage;
      } catch (err) {
        if (shouldAuditAudio) {
          logger.warn(
            {
              ticketId: ticket.id,
              whatsappId: whatsapp.id,
              provider: providerName,
              errorName: err instanceof Error ? err.name : null,
              errorMessage: err instanceof Error ? err.message : String(err)
            },
            "Audio contract audit: provider send failure"
          );
        }

        throw err;
      }
    };

    let sentMessage: ProviderMessage;
    try {
      sentMessage = await sendWithChatId(chatId);
    } catch (err) {
      if (isNoLidError(err)) {
        if (storedLid && chatId !== storedLid) {
          console.warn("SendWhatsAppMedia retrying with LID chat id", {
            ticketId: ticket.id,
            whatsappId: ticket.whatsappId,
            number: storedNumber,
            lid: storedLid
          });
          chatId = storedLid;
          sentMessage = await sendWithChatId(chatId);
        } else {
          const normalizedChatId = await resolveNormalizedChatId();
          if (normalizedChatId && normalizedChatId !== chatId) {
            chatId = normalizedChatId;
            sentMessage = await sendWithChatId(chatId);
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
        sentMessage = await sendWithChatId(chatId);
      } else if (!(err instanceof AppError)) {
        if (composerRecordedAudio) {
          const recordedAudioEchoDetected = await waitForRecentRecordedAudioEcho(
            ticket.id,
            requestStartedAt
          );

          if (recordedAudioEchoDetected) {
            logger.warn(
              {
                err,
                ticketId: ticket.id,
                whatsappId: whatsapp.id,
                chatId,
                originalName: media.originalname,
                mimetype: media.mimetype
              },
              "SendWhatsAppMedia detected recorded audio echo after provider error; skipping retry to avoid duplicate delivery"
            );

            await ticket.update({ lastMessage: resolvedBody || media.filename });
            if (normalizedNumber && normalizedNumber !== storedNumber) {
              await ticket.contact.update({ number: normalizedNumber });
            }
            safelyRemoveFile(media.path);
            safelyRemoveFile(convertedPath);

            return {
              id: `recorded-audio-echo-${ticket.id}-${Date.now()}`,
              body: resolvedBody || media.filename,
              fromMe: true,
              hasMedia: true,
              type: "audio",
              timestamp: Math.floor(Date.now() / 1000),
              from: "",
              to: chatId,
              hasQuotedMsg: false,
              ack: 1
            } as ProviderMessage;
          }
        }

        const normalizedChatId = await resolveNormalizedChatId();
        if (normalizedChatId && normalizedChatId !== chatId) {
          try {
            chatId = normalizedChatId;
            sentMessage = await sendWithChatId(chatId);
            await ticket.update({ lastMessage: resolvedBody || media.filename });
            if (normalizedNumber && normalizedNumber !== storedNumber) {
              await ticket.contact.update({ number: normalizedNumber });
            }
            safelyRemoveFile(media.path);
            safelyRemoveFile(convertedPath);
            return sentMessage;
          } catch (normalizedErr) {
            err = normalizedErr;
          }
        }

        console.warn("SendWhatsAppMedia failed, restarting session", {
          ticketId: ticket.id,
          whatsappId: whatsapp.id,
          chatId,
          error: err
        });
        await ensureWhatsappSession(ticket, true);
        await ensureWhatsappReady(ticket, whatsapp);
        await sleep(2000);
        sentMessage = await sendWithChatId(chatId);
      } else {
        throw err;
      }
    }

    await ticket.update({ lastMessage: resolvedBody || media.filename });
    if (normalizedNumber && normalizedNumber !== storedNumber) {
      await ticket.contact.update({ number: normalizedNumber });
    }

    safelyRemoveFile(media.path);
    safelyRemoveFile(convertedPath);

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
