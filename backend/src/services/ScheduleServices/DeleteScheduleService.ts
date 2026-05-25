import ShowScheduleService from "./ShowScheduleService";
import { ScheduleAccessData } from "./scheduleAccess";

const DeleteScheduleService = async (
  id: string | number,
  accessData?: ScheduleAccessData
): Promise<void> => {
  const schedule = await ShowScheduleService(id, accessData);

  await schedule.destroy();
};

export default DeleteScheduleService;
