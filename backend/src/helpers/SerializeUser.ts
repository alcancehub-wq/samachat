import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import { DEFAULT_SECTOR_PERMISSIONS } from "../utils/sectorPermissions";
import { logger } from "../utils/logger";

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

  const normalizePermissions = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.filter(item => typeof item === "string");
    }

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => typeof item === "string");
        }
      } catch (error) {
        logger?.warn({ err: error }, "Queue permissions JSON parse failed");
      }

      logger?.warn("Queue permissions is not a JSON array; ignoring value");
      return [];
    }

    return [];
  };

  if (user.queues && user.queues.length > 0) {
    user.queues.forEach(queue => {
      const normalizedPermissions = normalizePermissions(
        queue.permission?.permissions
      );
      const permissions =
        normalizedPermissions.length > 0
          ? normalizedPermissions
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
