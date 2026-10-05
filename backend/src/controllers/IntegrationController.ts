import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";

import ListIntegrationsService from "../services/IntegrationServices/ListIntegrationsService";
import CreateIntegrationService from "../services/IntegrationServices/CreateIntegrationService";
import ShowIntegrationService from "../services/IntegrationServices/ShowIntegrationService";
import UpdateIntegrationService from "../services/IntegrationServices/UpdateIntegrationService";
import DeleteIntegrationService from "../services/IntegrationServices/DeleteIntegrationService";


type IndexQuery = {
  searchParam?: string;
};

interface IntegrationData {
  name: string;
  type?: string;
  description?: string;
  isActive?: boolean;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam } = req.query as IndexQuery;

  const integrations = await ListIntegrationsService({ searchParam });

  return res.json(integrations);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newIntegration: IntegrationData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    type: Yup.string(),
    description: Yup.string(),
    isActive: Yup.boolean()
  });

  try {
    await schema.validate(newIntegration);
  } catch (err) {
    throw new AppError(err.message);
  }

  const integration = await CreateIntegrationService(newIntegration);

  const io = getIO();
  io.emit("integration", {
    action: "create",
    integration
  });

  return res.status(200).json(integration);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { integrationId } = req.params;

  const integration = await ShowIntegrationService(integrationId);

  return res.status(200).json(integration);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const integrationData: IntegrationData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string(),
    type: Yup.string(),
    description: Yup.string(),
    isActive: Yup.boolean()
  });

  try {
    await schema.validate(integrationData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { integrationId } = req.params;

  const integration = await UpdateIntegrationService({
    integrationId,
    integrationData
  });

  const io = getIO();
  io.emit("integration", {
    action: "update",
    integration
  });

  return res.status(200).json(integration);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { integrationId } = req.params;

  await DeleteIntegrationService(integrationId);

  const io = getIO();
  io.emit("integration", {
    action: "delete",
    integrationId
  });

  return res.status(200).json({ message: "Integration deleted" });
};
