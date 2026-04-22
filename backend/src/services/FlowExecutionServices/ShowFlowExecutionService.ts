import FlowExecution from "../../models/FlowExecution";
import FlowExecutionLog from "../../models/FlowExecutionLog";
import FlowNode from "../../models/FlowNode";
import Flow from "../../models/Flow";
import AppError from "../../errors/AppError";

const ShowFlowExecutionService = async (
  id: string | number
): Promise<FlowExecution> => {
  const execution = await FlowExecution.findByPk(id, {
    include: [
      {
        model: Flow,
        attributes: ["id", "name"]
      },
      {
        model: FlowNode,
        as: "currentNode",
        attributes: ["id", "type", "name"]
      },
      {
        model: FlowExecutionLog,
        separate: true,
        order: [["createdAt", "DESC"]]
      }
    ]
  });

  if (!execution) {
    throw new AppError("ERR_FLOW_EXECUTION_NOT_FOUND", 404);
  }

  return execution;
};

export default ShowFlowExecutionService;
