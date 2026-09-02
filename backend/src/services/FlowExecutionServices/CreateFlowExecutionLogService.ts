import FlowExecutionLog from "../../models/FlowExecutionLog";
import sanitizeOutboundAudit, {
  sanitizeOutboundAuditText
} from "../../utils/sanitizeOutboundAudit";

interface Request {
  flowExecutionId: number;
  nodeId?: number | null;
  event: string;
  message?: string;
  data?: any;
}

const CreateFlowExecutionLogService = async ({
  flowExecutionId,
  nodeId,
  event,
  message,
  data
}: Request): Promise<FlowExecutionLog> => {
  const log = await FlowExecutionLog.create({
    flowExecutionId,
    nodeId: nodeId || null,
    event,
    message: sanitizeOutboundAuditText(message) || null,
    data: data ? JSON.stringify(sanitizeOutboundAudit(data)) : null
  });

  return log;
};

export default CreateFlowExecutionLogService;
