import Task from "../../models/Task";
import AppError from "../../errors/AppError";

const DeleteTaskService = async (id: string | number): Promise<void> => {
  const task = await Task.findByPk(id);

  if (!task) {
    throw new AppError("ERR_NO_TASK_FOUND", 404);
  }

  await task.destroy();
};

export default DeleteTaskService;
