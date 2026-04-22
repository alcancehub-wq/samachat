import * as Yup from "yup";
import { Request, Response } from "express";
import AppError from "../errors/AppError";

import RunOpenAICompletionService from "../services/OpenAI/RunOpenAICompletionService";
import BuildTicketSummaryPromptService from "../services/OpenAI/BuildTicketSummaryPromptService";
import ListOpenAILogsService from "../services/OpenAILogServices/ListOpenAILogsService";
import GetOpenAISettingsService from "../services/OpenAISettingsServices/GetOpenAISettingsService";

export const logs = async (req: Request, res: Response): Promise<Response> => {
  const { limit, ticketId, contactId, userId } = req.query;

  const logsData = await ListOpenAILogsService({
    limit: limit ? Number(limit) : 20,
    ticketId: ticketId ? Number(ticketId) : undefined,
    contactId: contactId ? Number(contactId) : undefined,
    userId: userId ? Number(userId) : undefined
  });

  return res.status(200).json(logsData);
};

export const suggest = async (req: Request, res: Response): Promise<Response> => {
  const schema = Yup.object().shape({
    ticketId: Yup.number().nullable(),
    contactId: Yup.number().nullable(),
    text: Yup.string().required()
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const settings = await GetOpenAISettingsService();
  const prompt = settings.suggestionPrompt
    ? `${settings.suggestionPrompt}\n\n${req.body.text}`
    : `Sugira uma resposta profissional e objetiva para a mensagem abaixo:\n\n${req.body.text}`;

  const result = await RunOpenAICompletionService({
    action: "suggest",
    userPrompt: prompt,
    ticketId: req.body.ticketId || null,
    contactId: req.body.contactId || null,
    userId: Number(req.user.id)
  });

  return res.status(200).json(result);
};

export const rewrite = async (req: Request, res: Response): Promise<Response> => {
  const schema = Yup.object().shape({
    ticketId: Yup.number().nullable(),
    contactId: Yup.number().nullable(),
    text: Yup.string().required()
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const settings = await GetOpenAISettingsService();
  const prompt = settings.rewritePrompt
    ? `${settings.rewritePrompt}\n\n${req.body.text}`
    : `Reformule o texto abaixo de forma clara, cordial e objetiva:\n\n${req.body.text}`;

  const result = await RunOpenAICompletionService({
    action: "rewrite",
    userPrompt: prompt,
    ticketId: req.body.ticketId || null,
    contactId: req.body.contactId || null,
    userId: Number(req.user.id)
  });

  return res.status(200).json(result);
};

export const summarize = async (req: Request, res: Response): Promise<Response> => {
  const schema = Yup.object().shape({
    ticketId: Yup.number().required()
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const settings = await GetOpenAISettingsService();
  const ticketPrompt = await BuildTicketSummaryPromptService({
    ticketId: req.body.ticketId,
    limit: 30
  });

  const prompt = settings.summaryPrompt
    ? `${settings.summaryPrompt}\n\n${ticketPrompt}`
    : ticketPrompt;

  const result = await RunOpenAICompletionService({
    action: "summarize",
    userPrompt: prompt,
    ticketId: req.body.ticketId,
    userId: Number(req.user.id)
  });

  return res.status(200).json(result);
};

export const classify = async (req: Request, res: Response): Promise<Response> => {
  const schema = Yup.object().shape({
    ticketId: Yup.number().nullable(),
    text: Yup.string().required()
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const settings = await GetOpenAISettingsService();
  const prompt = settings.classificationPrompt
    ? `${settings.classificationPrompt}\n\n${req.body.text}`
    : `Classifique o texto abaixo com uma intencao/tipo em portugues, retornando apenas a intencao:\n\n${req.body.text}`;

  const result = await RunOpenAICompletionService({
    action: "classify",
    userPrompt: prompt,
    ticketId: req.body.ticketId || null,
    userId: Number(req.user.id)
  });

  return res.status(200).json(result);
};
