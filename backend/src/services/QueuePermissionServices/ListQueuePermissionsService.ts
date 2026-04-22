import Queue from "../../models/Queue";
import QueuePermission from "../../models/QueuePermission";
import { DEFAULT_SECTOR_PERMISSIONS } from "../../utils/sectorPermissions";

const ListQueuePermissionsService = async (): Promise<Queue[]> => {
  const queues = await Queue.findAll({
    include: [QueuePermission],
    order: [["name", "ASC"]]
  });

  await Promise.all(
    queues.map(async queue => {
      if (!queue.permission) {
        await QueuePermission.create({
          queueId: queue.id,
          permissions: DEFAULT_SECTOR_PERMISSIONS
        });
      }
    })
  );

  const refreshed = await Queue.findAll({
    include: [QueuePermission],
    order: [["name", "ASC"]]
  });

  return refreshed;
};

export default ListQueuePermissionsService;
