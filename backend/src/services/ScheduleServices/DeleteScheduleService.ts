import Schedule from "../../models/Schedule";
import AppError from "../../errors/AppError";

const DeleteScheduleService = async (id: string | number): Promise<void> => {
  const schedule = await Schedule.findByPk(id);

  if (!schedule) {
    throw new AppError("ERR_NO_SCHEDULE_FOUND", 404);
  }

  await schedule.destroy();
};

export default DeleteScheduleService;
