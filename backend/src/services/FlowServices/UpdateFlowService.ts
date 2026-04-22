import AppError from "../../errors/AppError";
import Flow from "../../models/Flow";

interface FlowData {
  name?: string;
  description?: string;
  status?: string;
  isActive?: boolean;
}

interface Request {
  flowId: string;
  flowData: FlowData;
}

const UpdateFlowService = async ({ flowId, flowData }: Request): Promise<Flow> => {
  const flow = await Flow.findByPk(flowId);

  if (!flow) {
    throw new AppError("ERR_FLOW_NOT_FOUND", 404);
  }

  const nextName = flowData.name ? flowData.name.trim() : undefined;

  if (flowData.name !== undefined && !nextName) {
    throw new AppError("ERR_FLOW_NAME_REQUIRED");
  }

  await flow.update({
    name: nextName ?? flow.name,
    description: flowData.description ?? flow.description,
    status: flowData.status ?? flow.status,
    isActive: flowData.isActive ?? flow.isActive
  });

  await flow.reload();

  return flow;
};

export default UpdateFlowService;
