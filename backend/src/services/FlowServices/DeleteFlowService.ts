import Flow from "../../models/Flow";
import AppError from "../../errors/AppError";

const DeleteFlowService = async (id: string | number): Promise<void> => {
  const flow = await Flow.findByPk(id);

  if (!flow) {
    throw new AppError("ERR_FLOW_NOT_FOUND", 404);
  }

  await flow.destroy();
};

export default DeleteFlowService;
