import AppError from "../../errors/AppError";
import Flow from "../../models/Flow";

interface Request {
  name: string;
  description?: string;
  status?: string;
  isActive?: boolean;
  createdById?: number | null;
}

const CreateFlowService = async ({
  name,
  description,
  status = "draft",
  isActive = true,
  createdById
}: Request): Promise<Flow> => {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new AppError("ERR_FLOW_NAME_REQUIRED");
  }

  const flow = await Flow.create({
    name: trimmedName,
    description,
    status,
    isActive,
    createdById: createdById || null
  });

  return flow;
};

export default CreateFlowService;
