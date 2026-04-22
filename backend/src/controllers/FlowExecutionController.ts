import * as Yup from "yup";
import { Request, Response } from "express";

import ExecuteFlowService from "../services/FlowExecutionServices/ExecuteFlowService";
import ListFlowExecutionsService from "../services/FlowExecutionServices/ListFlowExecutionsService";
import ShowFlowExecutionService from "../services/FlowExecutionServices/ShowFlowExecutionService";

import AppError from "../errors/AppError";

type IndexQuery = {
  flowId?: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { flowId } = req.query as IndexQuery;

  const executions = await ListFlowExecutionsService({
    flowId: flowId ? Number(flowId) : undefined
  });

  return res.status(200).json(executions);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { executionId } = req.params;

  const execution = await ShowFlowExecutionService(executionId);

  return res.status(200).json(execution);
};

export const test = async (req: Request, res: Response): Promise<Response> => {
  const schema = Yup.object().shape({
    input: Yup.string(),
    tags: Yup.array().of(Yup.string()),
    queueId: Yup.number().nullable()
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { flowId } = req.params;
  const { input, tags, queueId } = req.body;

  const execution = await ExecuteFlowService({
    flowId,
    input,
    tags,
    queueId,
    mode: "test"
  });

  const detailed = await ShowFlowExecutionService(execution.id);

  return res.status(200).json(detailed);
};

export const execute = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const schema = Yup.object().shape({
    input: Yup.string(),
    tags: Yup.array().of(Yup.string()),
    queueId: Yup.number().nullable(),
    ticketId: Yup.number().nullable(),
    contactId: Yup.number().nullable()
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { flowId } = req.params;
  const { input, tags, queueId, ticketId, contactId } = req.body;

  const execution = await ExecuteFlowService({
    flowId,
    input,
    tags,
    queueId,
    ticketId,
    contactId,
    mode: "execute"
  });

  const detailed = await ShowFlowExecutionService(execution.id);

  return res.status(200).json(detailed);
};
