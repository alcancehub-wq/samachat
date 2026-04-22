import path from "path";
import { Request, Response } from "express";
import ListFilesService from "../../services/FileServices/ListFilesService";
import ShowFileService from "../../services/FileServices/ShowFileService";
import uploadConfig from "../../config/upload";
import AppError from "../../errors/AppError";

type IndexQuery = {
  searchParam?: string;
  mediaType?: string;
  ticketId?: string;
  contactId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, mediaType, ticketId, contactId, dateFrom, dateTo } =
    req.query as IndexQuery;

  const files = await ListFilesService({
    searchParam,
    mediaType,
    ticketId: ticketId ? Number(ticketId) : undefined,
    contactId: contactId ? Number(contactId) : undefined,
    dateFrom,
    dateTo
  });

  return res.status(200).json({
    data: files,
    meta: {
      count: files.length
    }
  });
};

export const resolve = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { fileId } = req.params;

  const file = await ShowFileService(fileId);

  return res.status(200).json({
    data: {
      id: file.id,
      url: file.mediaUrl,
      mediaType: file.mediaType,
      createdAt: file.createdAt,
      ticketId: file.ticketId,
      contactId: file.contactId
    }
  });
};

export const download = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { fileId } = req.params;

  const file = await ShowFileService(fileId);
  const rawPath = file.getDataValue("mediaUrl");

  if (!rawPath) {
    throw new AppError("ERR_NO_MEDIA_FOUND", 404);
  }

  const filePath = path.resolve(uploadConfig.directory, rawPath);
  return res.download(filePath);
};
