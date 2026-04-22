import { Request, Response } from "express";

import ListFlowNodesService from "../services/FlowServices/ListFlowNodesService";
export const index = async (req: Request, res: Response): Promise<Response> => {
  const { flowId } = req.params;

  const nodes = await ListFlowNodesService(flowId);

  return res.status(200).json(nodes);
};
