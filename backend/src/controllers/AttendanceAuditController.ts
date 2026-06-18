import { Request, Response } from "express";
import * as Yup from "yup";

import AppError from "../errors/AppError";
import BuildAttendanceAuditDossierService from "../services/AttendanceAuditServices/BuildAttendanceAuditDossierService";

export const dossier = async (req: Request, res: Response): Promise<Response> => {
  const schema = Yup.object().shape({
    userId: Yup.number().required(),
    dateFrom: Yup.string().required(),
    dateTo: Yup.string().required(),
    status: Yup.string().nullable(),
    limit: Yup.number().nullable()
  });

  try {
    await schema.validate(req.query);
  } catch (err) {
    throw new AppError(err.message);
  }

  const result = await BuildAttendanceAuditDossierService({
    requesterId: req.user.id,
    requesterProfile: req.user.profile,
    userId: Number(req.query.userId),
    dateFrom: String(req.query.dateFrom),
    dateTo: String(req.query.dateTo),
    status: req.query.status ? String(req.query.status) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined
  });

  return res.status(200).json(result);
};
