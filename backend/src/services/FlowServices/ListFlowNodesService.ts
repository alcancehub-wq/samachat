import FlowNode from "../../models/FlowNode";
import AppError from "../../errors/AppError";
import Flow from "../../models/Flow";

const ListFlowNodesService = async (flowId: string | number): Promise<FlowNode[]> => {
  const flow = await Flow.findByPk(flowId);

  if (!flow) {
    throw new AppError("ERR_FLOW_NOT_FOUND", 404);
  }

  const nodes = await FlowNode.findAll({
    where: { flowId },
    order: [["id", "ASC"]]
  });

  return nodes;
};

export default ListFlowNodesService;
