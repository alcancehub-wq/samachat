import { Request, Response } from "express";

import ShowDashboardService from "../services/DashboardServices/ShowDashboardService";

export const show = async (req: Request, res: Response): Promise<Response> => {
  const periodQuery = String(req.query.period || "today");
  const normalizedPeriod =
    periodQuery === "7d" || periodQuery === "30d" ? periodQuery : "today";
  const queueId = req.query.queueId ? Number(req.query.queueId) : undefined;
  const assigneeId = req.query.assigneeId
    ? Number(req.query.assigneeId)
    : undefined;

  const dashboard = await ShowDashboardService({
    userId: req.user.id,
    profile: req.user.profile,
    period: normalizedPeriod,
    queueId,
    assigneeId
  });

  return res.status(200).json(dashboard);
};