import User from "../../models/User";
import Queue from "../../models/Queue";
import QueuePermission from "../../models/QueuePermission";
import { expandSectorPermissions } from "../../utils/sectorPermissions";
import { logger } from "../../utils/logger";

const normalizePermissions = (permissions?: unknown): string[] => {
  if (Array.isArray(permissions)) {
    return expandSectorPermissions(
      permissions.filter(permission => typeof permission === "string")
    );
  }

  if (typeof permissions === "string") {
    try {
      const parsed = JSON.parse(permissions);
      if (Array.isArray(parsed)) {
        return expandSectorPermissions(
          parsed.filter(permission => typeof permission === "string")
        );
      }
    } catch (error) {
      logger?.warn({ err: error }, "Queue permissions JSON parse failed");
    }
  }

  return expandSectorPermissions();
};

const GetUserPermissionsService = async (
  userId: number | string
): Promise<string[]> => {
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Queue,
        as: "queues",
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
