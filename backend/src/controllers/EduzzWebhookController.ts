import { Request, Response } from "express";

import ProcessEduzzWebhookService from "../services/EduzzIntegrationServices/ProcessEduzzWebhookService";

export const receive = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const integrationId = Number(req.params.integrationId);

  if (!Number.isInteger(integrationId) || integrationId <= 0) {
    return res.status(400).json({
      error: "ERR_EDUZZ_INTEGRATION_ID_INVALID"
    });
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const signature = req.headers["x-signature"];

  const result = await ProcessEduzzWebhookService({
    integrationId,
    payload: req.body,
    rawBody,
    signature
  });

  return res.status(200).json(result);
};
