import FlowExecution from "../../models/FlowExecution";
import Flow from "../../models/Flow";
import FlowExecutionLog from "../../models/FlowExecutionLog";

interface Request {
  flowId?: number;
}

const ListFlowExecutionsService = async ({ flowId }: Request): Promise<FlowExecution[]> => {
  const executions = await FlowExecution.findAll({
    where: flowId ? { flowId } : undefined,
    include: [
      {
        model: Flow,
        attributes: ["id", "name"]
      },
      {
        model: FlowExecutionLog,
        separate: true,
        order: [["createdAt", "DESC"]]
      }
    ],
    order: [["createdAt", "DESC"]]
  });

  return executions;
};

export default ListFlowExecutionsService;
