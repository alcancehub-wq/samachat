import AppError from "../../errors/AppError";
import Flow from "../../models/Flow";
import FlowNode from "../../models/FlowNode";
import FlowEdge from "../../models/FlowEdge";
import FlowExecution from "../../models/FlowExecution";
import Contact from "../../models/Contact";
import Tag from "../../models/Tag";
import CreateFlowExecutionLogService from "./CreateFlowExecutionLogService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import ShowTicketService from "../TicketServices/ShowTicketService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";

interface Request {
  flowId: string | number;
  input?: string;
  tags?: string[];
  queueId?: number;
  ticketId?: number | null;
  contactId?: number | null;
  mode?: "test" | "execute";
}

const parseJson = (value?: string | null): any => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (err) {
    return value;
  }
};

const matchCondition = (
  edge: FlowEdge,
  input: string,
  tags: string[],
  queueId?: number
): boolean => {
  const conditionType = edge.conditionType || "always";
  const conditionValue = parseJson(edge.conditionValue);

  if (conditionType === "always") {
    return true;
  }

  if (conditionType === "keyword") {
    if (!conditionValue) {
      return false;
    }
    return input.toLowerCase().includes(String(conditionValue).toLowerCase());
  }

  if (conditionType === "tag") {
    if (!conditionValue) {
      return false;
    }
    const values = Array.isArray(conditionValue)
      ? conditionValue
      : String(conditionValue)
          .split(",")
          .map(value => value.trim())
          .filter(Boolean);
    return values.some(value => tags.includes(value));
  }

  if (conditionType === "queue") {
    if (queueId === undefined || queueId === null) {
      return false;
    }
    return String(queueId) === String(conditionValue);
  }

  return false;
};

const resolveTicket = async (
  ticketId?: number | null,
  contactId?: number | null
) => {
  if (ticketId) {
    return ShowTicketService(ticketId);
  }

  if (contactId) {
    const contact = await Contact.findByPk(contactId);
    if (!contact) {
      throw new Error("ERR_FLOW_NO_CONTACT");
    }

    const defaultWhatsapp = await GetDefaultWhatsApp();
    return FindOrCreateTicketService(contact, defaultWhatsapp.id, 0);
  }

  throw new Error("ERR_FLOW_NO_TICKET");
};

const ExecuteFlowService = async ({
  flowId,
  input = "",
  tags = [],
  queueId,
  ticketId,
  contactId,
  mode = "execute"
}: Request): Promise<FlowExecution> => {
  const flow = await Flow.findByPk(flowId, {
    include: [
      {
        model: FlowNode
      },
      {
        model: FlowEdge
      }
    ]
  });

  if (!flow) {
    throw new AppError("ERR_FLOW_NOT_FOUND", 404);
  }

  if (ticketId || contactId) {
    const running = await FlowExecution.findOne({
      where: {
        flowId: flow.id,
        status: "running",
        ...(ticketId ? { ticketId } : {}),
        ...(contactId ? { contactId } : {})
      }
    });

    if (running) {
      throw new AppError("ERR_FLOW_ALREADY_RUNNING");
    }
  }

  const execution = await FlowExecution.create({
    flowId: flow.id,
    ticketId: ticketId || null,
    contactId: contactId || null,
    status: "running",
    startedAt: new Date(),
    input: input || null
  });

  await CreateFlowExecutionLogService({
    flowExecutionId: execution.id,
    event: "start",
    message: `Flow ${mode} started`
  });

  const nodes = flow.nodes || [];
  const edges = flow.edges || [];

  const nodeMap = new Map<number, FlowNode>();
  nodes.forEach(node => nodeMap.set(node.id, node));

  const startNode =
    nodes.find(node => node.type === "start") || nodes[0] || null;

  if (!startNode) {
    await execution.update({
      status: "failed",
      finishedAt: new Date()
    });
    await CreateFlowExecutionLogService({
      flowExecutionId: execution.id,
      event: "error",
      message: "Flow has no nodes"
    });

    return execution;
  }

  let currentNode: FlowNode | null = startNode;
  let stepCount = 0;

  while (currentNode && stepCount < 50) {
    stepCount += 1;

    if (!currentNode) {
      break;
    }

    await execution.update({ currentNodeId: currentNode.id });

    await CreateFlowExecutionLogService({
      flowExecutionId: execution.id,
      nodeId: currentNode.id,
      event: "node_enter",
      message: currentNode.name || currentNode.type,
      data: { type: currentNode.type }
    });

    const nodeData = parseJson(currentNode.data) || {};

    if (currentNode.type === "message") {
      await CreateFlowExecutionLogService({
        flowExecutionId: execution.id,
        nodeId: currentNode.id,
        event: "message",
        message: nodeData.text || "Message node executed",
        data: nodeData
      });

      if (mode === "execute") {
        try {
          const ticket = await resolveTicket(ticketId, contactId);
          const text = String(nodeData.text || "").trim();
          if (!text) {
            throw new Error("ERR_FLOW_MESSAGE_EMPTY");
          }
          await SendWhatsAppMessage({ body: text, ticket });
          await CreateFlowExecutionLogService({
            flowExecutionId: execution.id,
            nodeId: currentNode.id,
            event: "message_sent",
            message: "Message sent"
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Message send failed";
          await execution.update({
            status: "failed",
            finishedAt: new Date()
          });
          await CreateFlowExecutionLogService({
            flowExecutionId: execution.id,
            nodeId: currentNode.id,
            event: "error",
            message
          });
          break;
        }
      }
    }

    if (currentNode.type === "tag" && mode === "execute") {
      const tagId = nodeData.tagId || (Array.isArray(nodeData.tagIds) ? nodeData.tagIds[0] : null);

      try {
        if (!tagId) {
          throw new Error("ERR_FLOW_TAG_REQUIRED");
        }

        const tag = await Tag.findByPk(tagId);
        if (!tag) {
          throw new Error("ERR_FLOW_TAG_NOT_FOUND");
        }

        const ticket = ticketId ? await ShowTicketService(ticketId) : null;
        const contact = ticket ? ticket.contact : contactId ? await Contact.findByPk(contactId) : null;

        if (!contact) {
          throw new Error("ERR_FLOW_NO_CONTACT");
        }

        await contact.$add("tags", tag.id);
        await CreateFlowExecutionLogService({
          flowExecutionId: execution.id,
          nodeId: currentNode.id,
          event: "tag_applied",
          message: `Tag ${tag.id} applied`
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Tag apply failed";
        await execution.update({
          status: "failed",
          finishedAt: new Date()
        });
        await CreateFlowExecutionLogService({
          flowExecutionId: execution.id,
          nodeId: currentNode.id,
          event: "error",
          message
        });
        break;
      }
    }

    if (currentNode.type === "queue" || currentNode.type === "handoff") {
      if (mode === "execute") {
        try {
          if (!ticketId) {
            throw new Error("ERR_FLOW_NO_TICKET");
          }

          if (nodeData.queueId) {
            await UpdateTicketService({
              ticketId,
              ticketData: { queueId: nodeData.queueId }
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Queue update failed";
          await execution.update({
            status: "failed",
            finishedAt: new Date()
          });
          await CreateFlowExecutionLogService({
            flowExecutionId: execution.id,
            nodeId: currentNode.id,
            event: "error",
            message
          });
          break;
        }
      }

      await execution.update({
        status: "handoff",
        handoffQueueId: nodeData.queueId || null,
        finishedAt: new Date()
      });
      await CreateFlowExecutionLogService({
        flowExecutionId: execution.id,
        nodeId: currentNode.id,
        event: "handoff",
        message: "Handoff requested",
        data: { queueId: nodeData.queueId || null }
      });
      break;
    }

    if (currentNode.type === "end") {
      await execution.update({
        status: "completed",
        finishedAt: new Date()
      });
      await CreateFlowExecutionLogService({
        flowExecutionId: execution.id,
        nodeId: currentNode.id,
        event: "end",
        message: "Flow finished"
      });
      break;
    }

    const outgoing = edges
      .filter(edge => edge.sourceNodeId === currentNode!.id)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));

    const matched = outgoing.find(edge =>
      matchCondition(edge, input, tags, queueId)
    );

    if (!matched) {
      await execution.update({
        status: "failed",
        finishedAt: new Date()
      });
      await CreateFlowExecutionLogService({
        flowExecutionId: execution.id,
        nodeId: currentNode.id,
        event: "error",
        message: "No matching edge"
      });
      break;
    }

    currentNode = nodeMap.get(matched.targetNodeId) || null;
  }

  if (stepCount >= 50 && execution.status === "running") {
    await execution.update({
      status: "failed",
      finishedAt: new Date()
    });
    await CreateFlowExecutionLogService({
      flowExecutionId: execution.id,
      event: "error",
      message: "Flow execution reached step limit"
    });
  }

  await execution.reload();

  return execution;
};

export default ExecuteFlowService;
