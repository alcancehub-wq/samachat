import * as Yup from "yup";
import { Request, Response } from "express";

import AppError from "../errors/AppError";
import GenerateSdrPromptService from "../services/SdrAgentServices/GenerateSdrPromptService";
import { parseAllowedNumbers } from "../services/SdrAgentServices/policy";
import {
  getHandoffState,
  setHandoff
} from "../services/SdrAgentServices/SdrHandoffService";
import {
  effectivePrompt,
  getSdrAgentSettings,
  updateSdrAgentSettings
} from "../services/SdrAgentServices/SdrAgentSettingsService";

const validate = async (schema: Yup.ObjectSchema<any>, data: unknown) => {
  try {
    await schema.validate(data);
  } catch (err) {
    throw new AppError(err.message);
  }
};

export const showSettings = async (_req: Request, res: Response) => {
  const settings = await getSdrAgentSettings();
  return res.json({
    ...settings.toJSON(),
    hasPrompt: Boolean(effectivePrompt(settings))
  });
};

export const updateSettings = async (req: Request, res: Response) => {
  await validate(
    Yup.object().shape({
      isEnabled: Yup.boolean(),
      autoEnableForNewTickets: Yup.boolean(),
      testMode: Yup.boolean(),
      allowedNumbers: Yup.string().nullable(),
      agentName: Yup.string(),
      companyName: Yup.string(),
      systemPrompt: Yup.string().nullable(),
      model: Yup.string().nullable(),
      aiEngine: Yup.string().oneOf(["openai", "gemini", "claude"]).nullable(),
      temperature: Yup.number().nullable(),
      maxHistoryMessages: Yup.number().integer(),
      maxToolRounds: Yup.number().integer(),
      replyDelaySeconds: Yup.number().integer()
    }),
    req.body
  );
  const settings = await updateSdrAgentSettings(req.body);
  return res.json({
    ...settings.toJSON(),
    hasPrompt: Boolean(effectivePrompt(settings))
  });
};

// Resumo do agente para a lista de conversas (qualquer atendente logado pode ver):
// a tela usa isso para mostrar "IA" ou "Humano" em cada conversa.
export const publicStatus = async (_req: Request, res: Response) => {
  const s = await getSdrAgentSettings();
  return res.json({
    isEnabled: s.isEnabled,
    hasPrompt: Boolean(effectivePrompt(s)),
    autoEnableForNewTickets: s.autoEnableForNewTickets,
    testMode: s.testMode,
    allowedNumbers: s.testMode ? parseAllowedNumbers(s.allowedNumbers) : []
  });
};

// Quem esta atendendo esta conversa (IA ou humano) e por que.
export const showTicketHandoff = async (req: Request, res: Response) =>
  res.json(await getHandoffState(Number(req.params.ticketId)));

// Passa a conversa para a IA ("ai") ou para um humano ("human").
export const setTicketHandoff = async (req: Request, res: Response) => {
  await validate(
    Yup.object().shape({ mode: Yup.string().oneOf(["ai", "human"]).required() }),
    req.body
  );
  return res.json(
    await setHandoff(Number(req.params.ticketId), req.body.mode, Number(req.user.id))
  );
};

// Gerador de prompt com IA (mesmo formulario da BIA SDR).
export const generatePrompt = async (req: Request, res: Response) => {
  await validate(
    Yup.object().shape({
      sdr_name: Yup.string().required(),
      role: Yup.string(),
      company_name: Yup.string().required(),
      paper_type: Yup.string(),
      personality: Yup.string(),
      tone: Yup.string(),
      prohibited_terms: Yup.string(),
      philosophy_name: Yup.string(),
      lead_talk_percentage: Yup.number(),
      max_lines: Yup.number(),
      products: Yup.string().required(),
      differentials: Yup.string().required(),
      conversion_action: Yup.string(),
      tools: Yup.string()
    }),
    req.body
  );
  return res.json(await GenerateSdrPromptService(req.body));
};
