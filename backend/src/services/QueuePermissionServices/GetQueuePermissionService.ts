import QueuePermission from "../../models/QueuePermission";
import Queue from "../../models/Queue";
import { DEFAULT_SECTOR_PERMISSIONS } from "../../utils/sectorPermissions";

const GetQueuePermissionService = async (
  queueId: number | string
): Promise<QueuePermission> => {
  const permission = await QueuePermission.findOne({ where: { queueId } });

  if (!permission) {
    return QueuePermission.create({
      queueId: Number(queueId),
      permissions: DEFAULT_SECTOR_PERMISSIONS
    });
  }

  return permission;
};

export default GetQueuePermissionService;
