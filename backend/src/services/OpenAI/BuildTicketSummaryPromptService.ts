import Message from "../../models/Message";

interface Request {
  ticketId: number;
  limit?: number;
}

const BuildTicketSummaryPromptService = async ({
  ticketId,
  limit = 30
}: Request): Promise<string> => {
  const messages = await Message.findAll({
    where: { ticketId },
    order: [["createdAt", "DESC"]],
    limit
  });

  const timeline = messages
    .reverse()
    .map(msg => {
      const from = msg.fromMe ? "agent" : "customer";
      const body = msg.body || "";
      return `${from}: ${body}`;
    })
    .join("\n");

  return `Summarize this ticket conversation in Portuguese.\n\n${timeline}`;
};

export default BuildTicketSummaryPromptService;
