import Contact from "../../models/Contact";
import Flow from "../../models/Flow";
import FlowExecution from "../../models/FlowExecution";
import FlowTrigger from "../../models/FlowTrigger";
import Tag from "../../models/Tag";
import ShowTicketService from "../TicketServices/ShowTicketService";
import ExecuteFlowService from "./ExecuteFlowService";

interface Request {
  ticketId: number;
  contactId: number;
  messageBody?: string | null;
}

interface Response {
  handled: boolean;
  flowId?: number;
  action?: "started" | "resumed";
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

const normalizeText = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  return String(value).trim().toLowerCase();
};

const matchTrigger = (
  trigger: FlowTrigger,
  input: string,
  tags: string[],
  queueId?: number | null
): boolean => {
  const triggerType = trigger.type || "always";
  const triggerValue = parseJson(trigger.value);

  if (triggerType === "always") {
    return true;
  }

  if (triggerType === "keyword") {
    if (!triggerValue) {
      return false;
    }

    return input.includes(String(triggerValue).trim().toLowerCase());
  }

  if (triggerType === "tag") {
    if (!triggerValue) {
      return false;
    }

    const values = Array.isArray(triggerValue)
      ? triggerValue
      : String(triggerValue)
          .split(",")
          .map(value => value.trim().toLowerCase())
          .filter(Boolean);

    return values.some(value => tags.includes(value));
  }

  if (triggerType === "queue") {
    if (queueId === undefined || queueId === null || triggerValue === undefined || triggerValue === null) {
      return false;
    }

    return String(queueId) === String(triggerValue);
  }

  return false;
};

const triggerPriority = (type?: string | null): number => {
  switch (type) {
    case "keyword":
      return 0;
    case "tag":
      return 1;
    case "queue":
      return 2;
    case "always":
    default:
      return 3;
  }
};

const collectTagValues = async (ticketId: number, contactId: number): Promise<string[]> => {
  const [ticket, contact] = await Promise.all([
    ShowTicketService(ticketId),
    Contact.findByPk(contactId, {
      include: [
        {
          model: Tag,
          as: "tags",
          attributes: ["id", "name"],
          through: { attributes: [] }
        }
      ]
    })
  ]);

  const values = new Set<string>();

  (ticket.tags || []).forEach(tag => {
    values.add(String(tag.id));
    if (tag.name) {
      values.add(tag.name.trim().toLowerCase());
    }
  });

  (contact?.tags || []).forEach(tag => {
    values.add(String(tag.id));
    if (tag.name) {
      values.add(tag.name.trim().toLowerCase());
    }
  });

  return Array.from(values).filter(Boolean);
};

const HandleIncomingFlowMessageService = async ({
  ticketId,
  contactId,
  messageBody
}: Request): Promise<Response> => {
  const ticket = await ShowTicketService(ticketId);
  const normalizedInput = normalizeText(messageBody);
  const tags = await collectTagValues(ticketId, contactId);

  const activeExecution = await FlowExecution.findOne({
    where: {
      ticketId,
      contactId,
      status: ["running", "waiting_input"]
    },
    order: [["updatedAt", "DESC"], ["id", "DESC"]]
  });

  if (activeExecution) {
    await ExecuteFlowService({
      flowId: activeExecution.flowId,
      input: normalizedInput,
      tags,
      queueId: ticket.queueId,
      ticketId,
      contactId,
      mode: "execute"
    });

    return {
      handled: true,
      flowId: activeExecution.flowId,
      action: "resumed"
    };
  }

  const flows = await Flow.findAll({
    where: {
      status: "published",
      isActive: true
    },
    include: [
      {
        model: FlowTrigger,
        as: "triggers",
        required: true,
        where: { isActive: true }
      }
    ],
    order: [
      [{ model: FlowTrigger, as: "triggers" }, "id", "ASC"],
      ["id", "ASC"]
    ]
  });

  let matchedFlow: Flow | undefined;
  let matchedPriority = Number.MAX_SAFE_INTEGER;

  for (const flow of flows) {
    const matchedTrigger = (flow.triggers || []).find(trigger =>
      matchTrigger(trigger, normalizedInput, tags, ticket.queueId)
    );

    if (!matchedTrigger) {
      continue;
    }

    const priority = triggerPriority(matchedTrigger.type);
    if (!matchedFlow || priority < matchedPriority) {
      matchedFlow = flow;
      matchedPriority = priority;
    }
  }

  if (!matchedFlow) {
    return { handled: false };
  }

  await ExecuteFlowService({
    flowId: matchedFlow.id,
    input: normalizedInput,
    tags,
    queueId: ticket.queueId,
    ticketId,
    contactId,
    mode: "execute"
  });

  return {
    handled: true,
    flowId: matchedFlow.id,
    action: "started"
  };
};

export default HandleIncomingFlowMessageService;