import OpenAILog from "../../models/OpenAILog";

interface Request {
  action: string;
  status: string;
  model?: string | null;
  prompt?: string | null;
  response?: string | null;
  error?: string | null;
  durationMs?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  ticketId?: number | null;
  contactId?: number | null;
  userId?: number | null;
  metadata?: any;
}

const CreateOpenAILogService = async (data: Request): Promise<OpenAILog> => {
  const log = await OpenAILog.create({
    action: data.action,
    status: data.status,
    model: data.model || null,
    prompt: data.prompt || null,
    response: data.response || null,
    error: data.error || null,
    durationMs: data.durationMs || null,
    promptTokens: data.promptTokens || null,
    completionTokens: data.completionTokens || null,
    totalTokens: data.totalTokens || null,
    ticketId: data.ticketId || null,
    contactId: data.contactId || null,
    userId: data.userId || null,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null
  });

  return log;
};

export default CreateOpenAILogService;
