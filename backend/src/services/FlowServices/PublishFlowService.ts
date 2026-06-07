import AppError from "../../errors/AppError";
import Flow from "../../models/Flow";
import FlowNode from "../../models/FlowNode";
import FlowEdge from "../../models/FlowEdge";

interface Request {
  flowId: string;
  status: "draft" | "published";
}

const PublishFlowService = async ({ flowId, status }: Request): Promise<Flow> => {
  const flow = await Flow.findByPk(flowId);

  if (!flow) {
    throw new AppError("ERR_FLOW_NOT_FOUND", 404);
  }

  if (status === "published") {
    const nodes = await FlowNode.findAll({ where: { flowId: flow.id } });
    const edges = await FlowEdge.findAll({ where: { flowId: flow.id } });

    if (nodes.length === 0) {
      throw new AppError("ERR_FLOW_EMPTY");
    }

    const hasStart = nodes.some(node => node.type === "start");
    const hasEnd = nodes.some(node => node.type === "end");

    if (!hasStart || !hasEnd) {
      throw new AppError("ERR_FLOW_INVALID_NODES");
    }

    const nodeIds = new Set(nodes.map(node => node.id));
    const hasInvalidEdges = edges.some(
      edge => !nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)
    );

    if (hasInvalidEdges) {
      throw new AppError("ERR_FLOW_INVALID_EDGES");
    }
  }

  await flow.update({ status });
  await flow.reload();

  return flow;
};

export default PublishFlowService;
