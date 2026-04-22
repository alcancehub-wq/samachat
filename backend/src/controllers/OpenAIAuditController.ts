import * as Yup from "yup";
import { Request, Response } from "express";
import AppError from "../errors/AppError";
import OpenAIAuditService from "../services/OpenAI/OpenAIAuditService";
import OpenAIFixPlanService from "../services/OpenAI/OpenAIFixPlanService";

const allowedModules = ["webhook", "campanha", "agendamento", "fluxo"];

export const audit = async (req: Request, res: Response): Promise<Response> => {
  const schema = Yup.object().shape({
    module: Yup.string().oneOf(allowedModules).required(),
    code: Yup.string().nullable()
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { module, code } = req.body;

  const result = await OpenAIAuditService({
    module,
    code,
    userId: Number(req.user.id)
  });

  return res.status(200).json(result);
};

export const fixPlan = async (req: Request, res: Response): Promise<Response> => {
  const schema = Yup.object().shape({
    module: Yup.string().oneOf(allowedModules).required(),
    code: Yup.string().nullable()
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { module, code } = req.body;

  const result = await OpenAIFixPlanService({
    module,
    code,
    userId: Number(req.user.id)
  });

  return res.status(200).json(result);
};
