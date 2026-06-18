import { Request, Response } from "express";
import * as Yup from "yup";

import AppError from "../errors/AppError";
import BuildAttendanceAuditDossierService from "../services/AttendanceAuditServices/BuildAttendanceAuditDossierService";
import BuildAttendanceAuditReportPromptService from "../services/AttendanceAuditServices/BuildAttendanceAuditReportPromptService";
import RunOpenAICompletionService from "../services/OpenAI/RunOpenAICompletionService";

const filterSchema = Yup.object().shape({
  userId: Yup.number().required(),
  dateFrom: Yup.string().required(),
  dateTo: Yup.string().required(),
  status: Yup.string().nullable(),
  limit: Yup.number().nullable(),
  offset: Yup.number().nullable()
});

const buildDossierFromQuery = async (req: Request): Promise<any> => {
  try {
    await filterSchema.validate(req.query);
  } catch (err) {
    throw new AppError(err.message);
  }

  return BuildAttendanceAuditDossierService({
    requesterId: req.user.id,
    requesterProfile: req.user.profile,
    userId: Number(req.query.userId),
    dateFrom: String(req.query.dateFrom),
    dateTo: String(req.query.dateTo),
    status: req.query.status ? String(req.query.status) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    offset: req.query.offset ? Number(req.query.offset) : undefined
  });
};

export const dossier = async (req: Request, res: Response): Promise<Response> => {
  const result = await buildDossierFromQuery(req);

  return res.status(200).json(result);
};

export const report = async (req: Request, res: Response): Promise<Response> => {
  const dossierResult = await buildDossierFromQuery(req);
  const prompt = BuildAttendanceAuditReportPromptService(dossierResult);

  const result = await RunOpenAICompletionService({
    action: "attendance_audit_report",
    userPrompt: prompt,
    userId: Number(req.user.id),
    systemPrompt:
      "Voce e um auditor senior de atendimento comercial no WhatsApp. Gere relatorios objetivos, praticos e seguros para gestores."
  });

  return res.status(200).json({
    requested: dossierResult.requested,
    summary: dossierResult.summary,
    report: result
  });
};
