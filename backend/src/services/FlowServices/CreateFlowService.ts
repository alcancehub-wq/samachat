import AppError from "../../errors/AppError";
import Flow from "../../models/Flow";
import Whatsapp from "../../models/Whatsapp";

interface Request {
  name: string;
  description?: string;
  status?: string;
  isActive?: boolean;
  createdById?: number | null;
  whatsappId?: number | null;
}

const CreateFlowService = async ({
  name,
  description,
  status = "draft",
  isActive = true,
  createdById,
  whatsappId = null
}: Request): Promise<Flow> => {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new AppError("ERR_FLOW_NAME_REQUIRED");
  }

  if (whatsappId !== null && whatsappId !== undefined) {
    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      throw new AppError("ERR_NO_WAPP_FOUND", 404);
    }
  }

  const flow = await Flow.create({
    name: trimmedName,
    description,
    status,
    isActive,
    createdById: createdById || null,
    whatsappId
  });

  return flow;
};

export default CreateFlowService;
