import { Request, Response } from "express";
import GetQueuePermissionService from "../services/QueuePermissionServices/GetQueuePermissionService";
import UpdateQueuePermissionService from "../services/QueuePermissionServices/UpdateQueuePermissionService";
import ListQueuePermissionsService from "../services/QueuePermissionServices/ListQueuePermissionsService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const queues = await ListQueuePermissionsService();

  return res.status(200).json(queues);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { queueId } = req.params;
  const permission = await GetQueuePermissionService(queueId);

  return res.status(200).json(permission);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { queueId } = req.params;
  const { permissions } = req.body;

  const permission = await UpdateQueuePermissionService({
    queueId: Number(queueId),
    permissions
  });

  return res.status(200).json(permission);
};
