import Flow from "../../models/Flow";
import FlowNode from "../../models/FlowNode";
import FlowEdge from "../../models/FlowEdge";
import FlowTrigger from "../../models/FlowTrigger";
import AppError from "../../errors/AppError";

const ShowFlowService = async (id: string | number): Promise<Flow> => {
  const flow = await Flow.findByPk(id, {
    include: [
      {
        model: FlowNode
      },
      {
        model: FlowEdge
      },
      {
        model: FlowTrigger
      }
    ],
    order: [
      [{ model: FlowNode, as: "nodes" }, "id", "ASC"],
      [{ model: FlowEdge, as: "edges" }, "priority", "ASC"],
      [{ model: FlowTrigger, as: "triggers" }, "id", "ASC"]
    ]
  });

  if (!flow) {
    throw new AppError("ERR_FLOW_NOT_FOUND", 404);
  }

  return flow;
};

export default ShowFlowService;
