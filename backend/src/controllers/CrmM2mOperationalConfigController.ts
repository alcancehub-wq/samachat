import { Request, Response } from "express";
import AppError from "../errors/AppError";
import {
  GetCrmM2mOperationalConfig,
  UpdateCrmM2mOperationalConfig
} from "../services/CrmIntegrationServices/CrmM2mOperationalConfigService";
import GetCrmM2mCommercialOptions from "../services/CrmIntegrationServices/CrmM2mCommercialOptionsService";

const integrationIdFromRequest = (
  req: Request
): number => {
  const integrationId =
    Number(req.params.integrationId);

  if (
    !Number.isSafeInteger(integrationId) ||
    integrationId < 1
  ) {
    throw new AppError(
      "ERR_CRM_M2M_INTEGRATION_ID_INVALID",
      400
    );
  }

  return integrationId;
};

export const show = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const configuration =
    await GetCrmM2mOperationalConfig(
      integrationIdFromRequest(req)
    );

  return res.status(200).json(configuration);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const configuration =
    await UpdateCrmM2mOperationalConfig(
      integrationIdFromRequest(req),
      req.body
    );

  return res.status(200).json(configuration);
};

export const options = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const catalog =
    await GetCrmM2mCommercialOptions(
      integrationIdFromRequest(req)
    );

  return res.status(200).json(catalog);
};
