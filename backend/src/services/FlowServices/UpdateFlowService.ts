import AppError from "../../errors/AppError";
import Flow from "../../models/Flow";
import Whatsapp from "../../models/Whatsapp";

interface FlowData {
  name?: string;
  description?: string;
  status?: string;
  isActive?: boolean;
  whatsappId?: number | null;
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

  if (flowData.whatsappId !== undefined && flowData.whatsappId !== null) {
    const whatsapp = await Whatsapp.findByPk(flowData.whatsappId);

    if (!whatsapp) {
      throw new AppError("ERR_NO_WAPP_FOUND", 404);
    }
  }

  await flow.update({
    name: nextName ?? flow.name,
    description: flowData.description ?? flow.description,
    status: flowData.status ?? flow.status,
    isActive: flowData.isActive ?? flow.isActive,
    whatsappId: flowData.whatsappId !== undefined ? flowData.whatsappId : flow.whatsappId
  });

  await flow.reload();

  return flow;
};

export default UpdateFlowService;
