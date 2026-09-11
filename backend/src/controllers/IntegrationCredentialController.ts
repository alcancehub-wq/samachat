import { Request, Response } from "express";
import * as Yup from "yup";

import AppError from "../errors/AppError";
import {
  DeleteIntegrationCredentialService,
  ListIntegrationCredentialsService,
  SaveIntegrationCredentialService
} from "../services/IntegrationCredentialServices/IntegrationCredentialService";

const schema = Yup.object().shape({
  name: Yup.string().required(),
  type: Yup.string(),
  secret: Yup.string().nullable(),
  generate: Yup.boolean(),
  isDefault: Yup.boolean(),
  isActive: Yup.boolean()
});

const validate = async (data: any): Promise<void> => {
  try {
    await schema.validate(data);
  } catch (error) {
    throw new AppError(error.message);
  }
};

export const index = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const credentials =
    await ListIntegrationCredentialsService({
      integrationId: req.params.integrationId
    });

  return res.json(credentials);
};

export const store = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await validate(req.body);

  const result =
    await SaveIntegrationCredentialService({
      integrationId: req.params.integrationId,
      ...req.body
    });

  return res.status(201).json(result);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await validate(req.body);

  const result =
    await SaveIntegrationCredentialService({
      integrationId: req.params.integrationId,
      credentialId: req.params.credentialId,
      ...req.body
    });

  return res.json(result);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await DeleteIntegrationCredentialService({
    integrationId: req.params.integrationId,
    credentialId: req.params.credentialId
  });

  return res.json({
    message: "Integration credential deleted"
  });
};