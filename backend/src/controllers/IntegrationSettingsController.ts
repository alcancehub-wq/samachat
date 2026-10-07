import * as Yup from "yup";
import { Request, Response } from "express";

import AppError from "../errors/AppError";
import {
  getPublicIntegration,
  updateIntegration
} from "../services/IntegrationSettingsServices/IntegrationSettingsService";
import {
  ENGINE_LABELS,
  EngineId,
  getEngineStates
} from "../services/AiEngineServices/engines";
import { getIntegrationStatus } from "../services/IntegrationSettingsServices/IntegrationStatusService";
import { isProvider } from "../services/IntegrationSettingsServices/providers";

const assertProvider = (provider: string): void => {
  if (!isProvider(provider)) throw new AppError("ERR_INTEGRATION_UNKNOWN", 404);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  assertProvider(req.params.provider);
  return res.json(await getPublicIntegration(req.params.provider));
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  assertProvider(req.params.provider);

  const schema = Yup.object().shape({
    isActive: Yup.boolean(),
    values: Yup.object(),
    clearSecrets: Yup.array().of(Yup.string())
  });
  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  return res.json(await updateIntegration(req.params.provider, req.body));
};

// Quais motores de IA estao disponiveis (chave salva + ligado), sem segredos.
// Quem escolhe o motor que conversa com os leads e o agente SDR.
export const engines = async (_req: Request, res: Response): Promise<Response> => {
  const states = await getEngineStates();
  const list = (Object.keys(states) as EngineId[]).map(id => ({
    id,
    label: ENGINE_LABELS[id],
    ...states[id]
  }));
  return res.json({ engines: list });
};

// Status ao vivo (checagem leve ao provedor, sem gastar creditos).
export const status = async (req: Request, res: Response): Promise<Response> => {
  assertProvider(req.params.provider);
  return res.json(await getIntegrationStatus(req.params.provider));
};
