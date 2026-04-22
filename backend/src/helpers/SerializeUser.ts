import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import { DEFAULT_SECTOR_PERMISSIONS } from "../utils/sectorPermissions";

interface SerializedUser {
  id: number;
  name: string;
  email: string;
  profile: string;
  queues: Queue[];
  whatsapp: Whatsapp;
  permissions: string[];
}

export const SerializeUser = (user: User): SerializedUser => {
  const permissionSet = new Set<string>();

  if (user.queues && user.queues.length > 0) {
    user.queues.forEach(queue => {
      const permissions =
        queue.permission?.permissions && queue.permission.permissions.length > 0
          ? queue.permission.permissions
          : DEFAULT_SECTOR_PERMISSIONS;

      permissions.forEach(permission => permissionSet.add(permission));
    });
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    queues: user.queues,
    whatsapp: user.whatsapp,
    permissions: Array.from(permissionSet)
  };
};
