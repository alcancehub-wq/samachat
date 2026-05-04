import fs from "fs";
import path from "path";

import AppError from "../../errors/AppError";
import uploadConfig from "../../config/upload";
import Ticket from "../../models/Ticket";
import SendWhatsAppMedia from "./SendWhatsAppMedia";

interface Request {
  ticket: Ticket;
  fileName: string;
  originalName?: string | null;
  mimetype?: string | null;
  body?: string | null;
}

const inferMimeType = (fileName: string): string => {
  const extension = path.extname(fileName).toLowerCase();

  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".mp3":
      return "audio/mpeg";
    case ".ogg":
      return "audio/ogg";
    case ".wav":
      return "audio/wav";
    case ".mp4":
      return "video/mp4";
    case ".mov":
      return "video/quicktime";
    case ".pdf":
      return "application/pdf";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".xls":
      return "application/vnd.ms-excel";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/octet-stream";
  }
};

const SendStoredWhatsAppMedia = async ({
  ticket,
  fileName,
  originalName,
  mimetype,
  body
}: Request) => {
  const normalizedFileName = path.basename(fileName);
  const sourcePath = path.resolve(uploadConfig.directory, normalizedFileName);

  if (!sourcePath.startsWith(uploadConfig.directory)) {
    throw new AppError("ERR_FLOW_MEDIA_INVALID_PATH", 400);
  }

  if (!fs.existsSync(sourcePath)) {
    throw new AppError("ERR_FLOW_MEDIA_NOT_FOUND", 404);
  }

  const extension = path.extname(normalizedFileName);
  const tempFileName = `flow-media-${Date.now()}${extension}`;
  const tempPath = path.resolve(uploadConfig.directory, tempFileName);

  await fs.promises.copyFile(sourcePath, tempPath);

  return SendWhatsAppMedia({
    ticket,
    body: body || undefined,
    media: {
      filename: originalName || normalizedFileName,
      originalname: originalName || normalizedFileName,
      mimetype: mimetype || inferMimeType(normalizedFileName),
      path: tempPath
    } as Express.Multer.File
  });
};

export default SendStoredWhatsAppMedia;