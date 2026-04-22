import * as Yup from "yup";
import { Request, Response } from "express";

import ListFlowsService from "../services/FlowServices/ListFlowsService";
import CreateFlowService from "../services/FlowServices/CreateFlowService";
import ShowFlowService from "../services/FlowServices/ShowFlowService";
import UpdateFlowService from "../services/FlowServices/UpdateFlowService";
import DeleteFlowService from "../services/FlowServices/DeleteFlowService";
import PublishFlowService from "../services/FlowServices/PublishFlowService";
import SaveFlowGraphService from "../services/FlowServices/SaveFlowGraphService";

import AppError from "../errors/AppError";

type IndexQuery = {
  searchParam?: string;
  status?: string;
  isActive?: string;
};

interface FlowData {
  name?: string;
  description?: string;
  status?: string;
  isActive?: boolean;
}

const serializeNodeData = (value?: string | null): any => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (err) {
    return value;
  }
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, status, isActive } = req.query as IndexQuery;

  const flows = await ListFlowsService({
    searchParam,
    status,
    isActive: isActive !== undefined ? isActive === "true" : undefined
  });

  return res.json(flows);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newFlow: FlowData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    description: Yup.string(),
    status: Yup.string(),
    isActive: Yup.boolean()
  });

  try {
    await schema.validate(newFlow);
  } catch (err) {
    throw new AppError(err.message);
  }

  const flow = await CreateFlowService({
    name: newFlow.name as string,
    description: newFlow.description,
    status: newFlow.status,
    isActive: newFlow.isActive,
    createdById: Number(req.user.id)
  });

  return res.status(200).json(flow);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { flowId } = req.params;

  const flow = await ShowFlowService(flowId);
  const data = flow.toJSON() as any;

  const nodes = (data.nodes || []).map((node: any) => ({
    ...node,
    data: serializeNodeData(node.data)
  }));

  const edges = (data.edges || []).map((edge: any) => ({
    ...edge,
    conditionValue: serializeNodeData(edge.conditionValue)
  }));

  const triggers = (data.triggers || []).map((trigger: any) => ({
    ...trigger,
    value: serializeNodeData(trigger.value)
  }));

  return res.status(200).json({
    ...data,
    nodes,
    edges,
    triggers
  });
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const flowData: FlowData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string(),
    description: Yup.string(),
    status: Yup.string(),
    isActive: Yup.boolean()
  });

  try {
    await schema.validate(flowData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { flowId } = req.params;

  const flow = await UpdateFlowService({
    flowId,
    flowData
  });

  return res.status(200).json(flow);
};

export const updateGraph = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const schema = Yup.object().shape({
    nodes: Yup.array().of(
      Yup.object().shape({
        id: Yup.number(),
        type: Yup.string().required(),
        name: Yup.string(),
        data: Yup.mixed(),
        positionX: Yup.number(),
        positionY: Yup.number()
      })
    ),
    edges: Yup.array().of(
      Yup.object().shape({
        id: Yup.number(),
        sourceNodeId: Yup.number().required(),
        targetNodeId: Yup.number().required(),
        conditionType: Yup.string(),
        conditionValue: Yup.mixed(),
        priority: Yup.number()
      })
    ),
    triggers: Yup.array().of(
      Yup.object().shape({
        id: Yup.number(),
        type: Yup.string().required(),
        value: Yup.mixed(),
        isActive: Yup.boolean()
      })
    )
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { flowId } = req.params;
  const { nodes, edges, triggers } = req.body;

  await SaveFlowGraphService({
    flowId,
    nodes,
    edges,
    triggers
  });

  const flow = await ShowFlowService(flowId);
  const data = flow.toJSON() as any;

  return res.status(200).json({
    ...data,
    nodes: (data.nodes || []).map((node: any) => ({
      ...node,
      data: serializeNodeData(node.data)
    })),
    edges: (data.edges || []).map((edge: any) => ({
      ...edge,
      conditionValue: serializeNodeData(edge.conditionValue)
    })),
    triggers: (data.triggers || []).map((trigger: any) => ({
      ...trigger,
      value: serializeNodeData(trigger.value)
    }))
  });
};

export const publish = async (req: Request, res: Response): Promise<Response> => {
  const { flowId } = req.params;

  const flow = await PublishFlowService({ flowId, status: "published" });

  return res.status(200).json(flow);
};

export const unpublish = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { flowId } = req.params;

  const flow = await PublishFlowService({ flowId, status: "draft" });

  return res.status(200).json(flow);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { flowId } = req.params;

  await DeleteFlowService(flowId);

  return res.status(200).json({ message: "Flow deleted" });
};
