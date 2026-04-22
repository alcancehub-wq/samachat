import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { whatsappProvider, ProviderMessage } from "../../providers/WhatsApp";

import formatBody from "../../helpers/Mustache";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import { sleep } from "../../utils/sleep";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
}

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

const convertWebmToOgg = (inputPath: string): Promise<string> => {
  const outputPath = inputPath.replace(/\.webm$/i, ".ogg");

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

const ensureWhatsappSession = async (ticket: Ticket): Promise<Whatsapp> => {
  if (!ticket.whatsappId) {
    throw new AppError("ERR_TICKET_NO_WHATSAPP");
  }

  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
  if (!whatsapp) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }

  if (whatsapp.status !== "CONNECTED") {
    await StartWhatsAppSession(whatsapp);
  }

  return whatsapp;
};

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body
}: Request): Promise<ProviderMessage> => {
  try {
    const whatsapp = await ensureWhatsappSession(ticket);

    let normalizedNumber = await whatsappProvider.checkNumber(
      whatsapp.id,
      ticket.contact.number
    );
    if (!normalizedNumber) {
      console.warn("SendWhatsAppMedia number not validated on first try", {
        ticketId: ticket.id,
        whatsappId: whatsapp.id,
        number: ticket.contact.number
      });
      await StartWhatsAppSession(whatsapp);
      await sleep(2000);
      normalizedNumber = await whatsappProvider.checkNumber(
        whatsapp.id,
        ticket.contact.number
      );
    }
    if (!normalizedNumber) {
      throw new AppError("ERR_WAPP_INVALID_CONTACT");
    }

    if (normalizedNumber !== ticket.contact.number) {
      await ticket.contact.update({ number: normalizedNumber });
    }

    const chatId = `${normalizedNumber}@${ticket.isGroup ? "g" : "c"}.us`;

    const hasBody = body
      ? formatBody(body as string, ticket.contact)
      : undefined;

    let mediaInput = {
      filename: media.filename,
      mimetype: media.mimetype,
      path: media.path
    };

    let convertedPath: string | null = null;
    if (media.mimetype === "audio/webm") {
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
        console.warn("SendWhatsAppMedia blocked by No LID for user", {
          ticketId: ticket.id,
          whatsappId: whatsapp.id,
          number: ticket.contact.number
        });
        throw new AppError("ERR_WAPP_INVALID_CONTACT");
      }
      if (err instanceof AppError && err.message === "ERR_WAPP_NOT_INITIALIZED") {
        console.error("SendWhatsAppMedia session not initialized", {
          ticketId: ticket.id,
          whatsappId: whatsapp.id,
          whatsappStatus: whatsapp.status
        });
        await ensureWhatsappSession(ticket);
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
