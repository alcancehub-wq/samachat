import * as Yup from "yup";
import { Request, Response } from "express";
import AppError from "../errors/AppError";

import GetOpenAISettingsService from "../services/OpenAISettingsServices/GetOpenAISettingsService";
import UpdateOpenAISettingsService from "../services/OpenAISettingsServices/UpdateOpenAISettingsService";
import RunOpenAICompletionService from "../services/OpenAI/RunOpenAICompletionService";

export const show = async (req: Request, res: Response): Promise<Response> => {
  const settings = await GetOpenAISettingsService();

  return res.status(200).json({
    ...settings.toJSON(),
    apiKey: settings.apiKey ? "********" : null
  });
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const schema = Yup.object().shape({
    apiKey: Yup.string().nullable(),
    isActive: Yup.boolean(),
    model: Yup.string(),
    temperature: Yup.number().min(0).max(2),
    topP: Yup.number().min(0).max(1),
    maxTokens: Yup.number().min(16).max(4000),
    presencePenalty: Yup.number().min(-2).max(2),
    frequencyPenalty: Yup.number().min(-2).max(2),
    systemPrompt: Yup.string().nullable(),
    suggestionPrompt: Yup.string().nullable(),
    rewritePrompt: Yup.string().nullable(),
    summaryPrompt: Yup.string().nullable(),
    classificationPrompt: Yup.string().nullable(),
    autoReplyEnabled: Yup.boolean(),
    autoReplyPrompt: Yup.string().nullable(),
    maxRequestsPerDay: Yup.number().nullable(),
    maxRequestsPerHour: Yup.number().nullable()
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const settings = await UpdateOpenAISettingsService(req.body);

  return res.status(200).json({
    ...settings.toJSON(),
    apiKey: settings.apiKey ? "********" : null
  });
};

export const test = async (req: Request, res: Response): Promise<Response> => {
  const result = await RunOpenAICompletionService({
    action: "test",
    userPrompt: "Teste de conexao OpenAI. Responda com OK.",
    userId: Number(req.user.id)
  });

  return res.status(200).json({
    status: "ok",
    message: result.content || "OK",
    model: result.model
  });
};
