import User from "../../models/User";
import Queue from "../../models/Queue";
import QueuePermission from "../../models/QueuePermission";
import { DEFAULT_SECTOR_PERMISSIONS } from "../../utils/sectorPermissions";

const normalizePermissions = (permissions?: string[] | null): string[] => {
  if (!permissions || permissions.length === 0) {
    return DEFAULT_SECTOR_PERMISSIONS;
  }

  return permissions;
};

const GetUserPermissionsService = async (
  userId: number | string
): Promise<string[]> => {
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Queue,
        include: [QueuePermission]
      }
    ]
  });

  if (!user || !user.queues) {
    return [];
  }

  const permissionSet = new Set<string>();

  user.queues.forEach(queue => {
    const queuePermissions = normalizePermissions(
      queue.permission?.permissions
    );

    queuePermissions.forEach(permission => permissionSet.add(permission));
  });

  return Array.from(permissionSet);
};

export default GetUserPermissionsService;
