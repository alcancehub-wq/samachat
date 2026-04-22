import { Request, Response } from "express";
import ListFilesService from "../services/FileServices/ListFilesService";
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

  return res.status(200).json(files);
};
